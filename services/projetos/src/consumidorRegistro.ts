import { ConfirmChannel, ConsumeMessage } from 'amqplib';
import { PublicadorEventos } from './eventos';
import {
    buscarProjeto,
    criarProjeto,
    atualizarProjeto
} from './repositorio';

export const FILA_REGISTRO = 'registro-projetos';

export async function iniciarConsumidorRegistro(
    canal: ConfirmChannel,
    publicador: PublicadorEventos
): Promise<void> {
    await canal.assertQueue(FILA_REGISTRO, { durable: true });

    await canal.prefetch(1);

    await canal.consume(FILA_REGISTRO, async (msg: ConsumeMessage | null) => {
        if (!msg) return;

        try {
            const d = JSON.parse(msg.content.toString());

            if (!d.id || !d.genero || d.duracao == null ||
                d.orcamento == null || !d.prazo) {
                throw new Error('Mensagem de registro incompleta');
            }

            const existente = await buscarProjeto(d.id);

            if (existente) {
                const projeto = await atualizarProjeto(d.id, d);
                await publicador.publicar('PROJETO_ATUALIZADO', projeto!);
            } else {
                const projeto = await criarProjeto(d);
                await publicador.publicar('PROJETO_CRIADO', projeto);
            }

            canal.ack(msg);
        } catch (e) {
            console.error('Erro ao registrar projeto:', (e as Error).message);
            canal.nack(msg, false, false);
        }
    });

    console.log(`Consumidor escutando a fila "${FILA_REGISTRO}"`);
}