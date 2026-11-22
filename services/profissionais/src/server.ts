import Fastify from 'fastify';
import { iniciarBanco, pool } from './db';
import { listarProfissionais } from './repositorio';
import { conectarRabbitMQ, rabbitConectado } from './mensageria';
import { iniciarConsumidor } from './consumidor';

const PORTA = Number(process.env.PORT) || 3001;

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
        servico: 'cinebridge-profissionais',
        banco,
        rabbitmq
    });
});

app.get('/profissionais', async () => listarProfissionais());

async function iniciar(): Promise<void> {
    await iniciarBanco();

    const { canal } = await conectarRabbitMQ();
    await iniciarConsumidor(canal);

    await app.listen({ port: PORTA, host: '0.0.0.0' });
    console.log(`cinebridge-profissionais rodando na porta ${PORTA}`);
}

iniciar().catch((err) => {
    console.error(err);
    process.exit(1);
});