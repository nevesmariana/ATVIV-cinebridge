import { Channel, ConsumeMessage } from 'amqplib';
import { DespachanteEventos, EventoProjeto } from './observadores';

export const FILA_EVENTOS = 'eventos-projetos';

export async function iniciarConsumidor(
    canal: Channel,
    despachante: DespachanteEventos
): Promise<void> {
    await canal.assertQueue(FILA_EVENTOS, { durable: true });

    await canal.prefetch(1);

    await canal.consume(FILA_EVENTOS, async (msg: ConsumeMessage | null) => {
        if (!msg) return;

        try {
            const evento: EventoProjeto = JSON.parse(msg.content.toString());
            await despachante.emitir(evento);

            canal.ack(msg);
        } catch (e) {
            console.error('Erro ao processar evento:', (e as Error).message);
            canal.nack(msg, false, false);
        }
    });

    console.log(`Consumidor escutando a fila "${FILA_EVENTOS}"`);
}