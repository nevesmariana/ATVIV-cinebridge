import { buildApp } from './http/build';

import { conectarRabbitMQ, rabbitConectado } from './mensageria/conexao';
import { ClienteRPC } from './mensageria/ClienteRPC';
import { RepositorioProfissionalRabbitMQ } from './repositories/RepositorioProfissionalRabbitMQ';
import { RegistradorProjetoRabbitMQ } from './integracao/RegistradorProjetoRabbitMQ';

import { iniciarBanco, bancoDisponivel } from './persistencia/db';
import { RepositorioRecomendacaoPg } from './persistencia/RepositorioRecomendacao';
import { PersistenciaRecomendacao } from './observers/PersistenciaRecomendacao';

async function iniciar(): Promise<void> {
    await iniciarBanco();
    const repositorioRecomendacao = new RepositorioRecomendacaoPg();

    const { conexao, canal } = await conectarRabbitMQ();

    const repositorio =
        new RepositorioProfissionalRabbitMQ(
            new ClienteRPC(canal)
        );

    const canalPublicacao = await conexao.createConfirmChannel();
    const registrador =
        new RegistradorProjetoRabbitMQ(canalPublicacao);
    await registrador.iniciar();

    const app = buildApp(
        repositorio,
        registrador,
        [new PersistenciaRecomendacao(repositorioRecomendacao)]
    );

    app.get('/health', async (_request, reply) => {
        const banco = (await bancoDisponivel()) ? 'ok' : 'indisponivel';
        const rabbitmq = rabbitConectado() ? 'ok' : 'indisponivel';
        const saudavel = banco === 'ok' && rabbitmq === 'ok';

        return reply.status(saudavel ? 200 : 503).send({
            status: saudavel ? 'ok' : 'erro',
            servico: 'cinebridge-api',
            banco,
            rabbitmq
        });
    });

    app.get('/recomendacoes', async () => repositorioRecomendacao.listar());

    await app.listen({
        port: 3000,
        host: '0.0.0.0'
    });

    console.log('Servidor rodando na porta 3000');
}

iniciar().catch((err) => {
    console.error(err);
    process.exit(1);
});