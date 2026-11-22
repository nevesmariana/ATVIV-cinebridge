import Fastify from 'fastify';
import { iniciarBanco, pool } from './db';
import { conectarRabbitMQ, rabbitConectado } from './mensageria';
import { iniciarConsumidor } from './consumidor';
import {
    DespachanteEventos,
    NotificadorEmail,
    NotificadorInterno
} from './observadores';
import { listarNotificacoes } from './repositorio';

const PORTA = Number(process.env.PORT) || 3003;

const app = Fastify({ logger: false });

app.get('/health', async (_request, reply) => {
    let banco = 'ok';
    try {
        await pool.query('SELECT 1');
    } catch {
        banco = 'indisponivel';
    }
    const rabbitmq = rabbitConectado() ? 'ok' : 'indisponivel';

    const saudavel = banco === 'ok' && rabbitmq === 'ok';
    return reply.status(saudavel ? 200 : 503).send({
        status: saudavel ? 'ok' : 'erro',
        servico: 'cinebridge-notificacoes',
        banco,
        rabbitmq
    });
});

app.get('/notificacoes', async () => listarNotificacoes());

async function iniciar(): Promise<void> {
    await iniciarBanco();

    const { canal } = await conectarRabbitMQ();

    const despachante = new DespachanteEventos();
    despachante.registrar(new NotificadorEmail());
    despachante.registrar(new NotificadorInterno());

    await iniciarConsumidor(canal, despachante);

    await app.listen({ port: PORTA, host: '0.0.0.0' });
    console.log(`cinebridge-notificacoes rodando na porta ${PORTA}`);
}

iniciar().catch((err) => {
    console.error(err);
    process.exit(1);
});