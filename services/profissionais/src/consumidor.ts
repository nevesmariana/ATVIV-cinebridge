import { Channel, ConsumeMessage } from 'amqplib';
import { listarProfissionais, buscarProfissionalPorId } from './repositorio';

export const FILA_CONSULTA = 'consulta-profissionais';
async function processar(conteudo: any) {
    switch (conteudo.operacao) {
        case 'listarTodos':
            return listarProfissionais();
        case 'buscarPorId':
            return buscarProfissionalPorId(conteudo.id);
        default:
            throw new Error(`Operacao desconhecida: ${conteudo.operacao}`);
    }
}

export async function iniciarConsumidor(canal: Channel): Promise<void> {
    await canal.assertQueue(FILA_CONSULTA, { durable: true });

    await canal.prefetch(1);

    await canal.consume(FILA_CONSULTA, async (msg: ConsumeMessage | null) => {
        if (!msg) return;

        const { replyTo, correlationId } = msg.properties;

        let resposta: object;
        try {
            const conteudo = JSON.parse(msg.content.toString());
            const dados = await processar(conteudo);
            resposta = { ok: true, dados };
        } catch (e) {
            resposta = { ok: false, erro: (e as Error).message };
        }

        if (replyTo) {
            canal.sendToQueue(replyTo, Buffer.from(JSON.stringify(resposta)), {
                correlationId,
                persistent: true
            });
        }

        canal.ack(msg);
    });

    console.log(`Consumidor escutando a fila "${FILA_CONSULTA}"`);
}