import Fastify, {
    FastifyInstance
} from 'fastify';

import { registrarRotas } from './rotas';

import { RepositorioProfissional } from '../repositories/RepositorioProfissional';

import { OrquestradorPadrao } from '../orchestration/OrquestradorPadrao';

import { SistemaRecomendacao } from '../observers/SistemaRecomendacao';

import { SimilaridadeCosseno } from '../strategies/SimilaridadeCosseno';

import { NotificadorEmail } from '../observers/NotificadorEmail';
import { NotificadorInterno } from '../observers/NotificadorInterno';
import { AuditoriaRecomendacao } from '../observers/AuditoriaRecomendacao';
import { FabricaDocumentario } from '../factories/documentario/FabricaDocumentario';
import { FabricaAnimacao } from '../factories/animacao/FabricaAnimacao';
import { FabricaPublicitario } from '../factories/publicitario/FabricaPublicitario';
import { RegistradorProjeto } from '../integracao/RegistradorProjeto';
import { Observador } from '../observers/Observador';

export function buildApp(
    repositorio: RepositorioProfissional,
    registrador?: RegistradorProjeto,
    observadoresExtras: Observador[] = []
): FastifyInstance {

    const app = Fastify({
        logger: false
    });

    const orquestrador =
        new OrquestradorPadrao(
            repositorio
        );

    const sistema =
        new SistemaRecomendacao(
            orquestrador,
            new SimilaridadeCosseno()
        );

    sistema.adicionarObservador(
        new NotificadorEmail()
    );

    sistema.adicionarObservador(
        new NotificadorInterno()
    );

    sistema.adicionarObservador(
        new AuditoriaRecomendacao()
    );

    for (const observador of observadoresExtras) {
        sistema.adicionarObservador(observador);
    }

    if (registrador) {
        sistema.definirRegistradorProjeto(
            registrador
        );
    }

    sistema.registrarFabrica(
        'documentario',
        new FabricaDocumentario()
    );

    sistema.registrarFabrica(
        'animacao',
        new FabricaAnimacao()
    );

    sistema.registrarFabrica(
        'publicitario',
        new FabricaPublicitario()
    );

    registrarRotas(
        app,
        sistema
    );

    return app;
}