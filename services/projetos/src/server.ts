import Fastify from 'fastify';
import { iniciarBanco, pool } from './db';
import { conectarRabbitMQ, rabbitConectado } from './mensageria';
import { iniciarConsumidorRegistro } from './consumidorRegistro';
import { PublicadorEventos } from './eventos';
import {
    criarProjeto,
    atualizarProjeto,
    finalizarProjeto,
    buscarProjeto,
    listarProjetos
} from './repositorio';

const PORTA = Number(process.env.PORT) || 3002;

const app = Fastify({ logger: false });

let publicador: PublicadorEventos;

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
        servico: 'cinebridge-projetos',
        banco,
        rabbitmq
    });
});

app.get('/projetos', async () => listarProjetos());

app.get('/projetos/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const projeto = await buscarProjeto(id);
    return projeto ?? reply.status(404).send({ erro: 'Projeto nao encontrado' });
});

app.post('/projetos', async (request, reply) => {
    const d = (request.body ?? {}) as any;

    if (!d.id || !d.genero || d.duracao == null || d.orcamento == null || !d.prazo) {
        return reply.status(400).send({
            erro: 'Campos obrigatorios: id, genero, duracao, orcamento, prazo'
        });
    }

    try {
        const projeto = await criarProjeto(d);
        await publicador.publicar('PROJETO_CRIADO', projeto);
        return reply.status(201).send(projeto);
    } catch (e: any) {
        if (e.code === '23505') {
            return reply.status(409).send({ erro: 'Ja existe um projeto com esse id' });
        }
        throw e;
    }
});

app.put('/projetos/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const projeto = await atualizarProjeto(id, request.body ?? {});
    if (!projeto) {
        return reply.status(404).send({ erro: 'Projeto nao encontrado' });
    }
    await publicador.publicar('PROJETO_ATUALIZADO', projeto);
    return projeto;
});

app.post('/projetos/:id/finalizar', async (request, reply) => {
    const { id } = request.params as { id: string };
    const projeto = await finalizarProjeto(id);
    if (!projeto) {
        return reply.status(404).send({ erro: 'Projeto nao encontrado' });
    }
    await publicador.publicar('PROJETO_FINALIZADO', projeto);
    return projeto;
});

async function iniciar(): Promise<void> {
    await iniciarBanco();

    const { canal } = await conectarRabbitMQ();
    publicador = new PublicadorEventos(canal);
    await publicador.iniciar();
    await iniciarConsumidorRegistro(canal, publicador);

    await app.listen({ port: PORTA, host: '0.0.0.0' });
    console.log(`cinebridge-projetos rodando na porta ${PORTA}`);
}

iniciar().catch((err) => {
    console.error(err);
    process.exit(1);
});