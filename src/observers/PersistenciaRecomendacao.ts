import { Observador } from './Observador';
import { EventoRecomendacao } from '../domain/EventoRecomendacao';
import {
    MembroRegistro,
    RepositorioRecomendacao
} from '../persistencia/RepositorioRecomendacao';

export class PersistenciaRecomendacao implements Observador {
    constructor(
        private readonly repositorio: RepositorioRecomendacao
    ) { }

    atualizar(evento: EventoRecomendacao): void {
        if (evento.tipo !== 'RECOMENDACAO_GERADA') {
            return;
        }

        const registro = {
            projetoId: String(evento.dados.get('projetoId')),
            equipeId: String(evento.dados.get('equipeId')),
            tipoProjeto: evento.dados.get('tipoProjeto') as
                string | undefined,
            membros: (evento.dados.get('membros') as
                MembroRegistro[] | undefined) ?? []
        };

        this.repositorio.salvar(registro).catch((erro: Error) => {
            console.error(
                'Falha ao gravar a recomendacao:',
                erro.message
            );
        });
    }
}