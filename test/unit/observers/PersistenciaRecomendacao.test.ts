import { PersistenciaRecomendacao } from '../../../src/observers/PersistenciaRecomendacao';
import { EventoRecomendacao } from '../../../src/domain/EventoRecomendacao';
import {
    RecomendacaoRegistro,
    RepositorioRecomendacao
} from '../../../src/persistencia/RepositorioRecomendacao';

function criarRepositorioFalso(
    salvar: RepositorioRecomendacao['salvar']
): RepositorioRecomendacao {
    return {
        salvar,
        listar: jest.fn().mockResolvedValue([])
    };
}

const esperarPromessas = () => new Promise((r) => setImmediate(r));

describe('PersistenciaRecomendacao (Observer)', () => {
    it('grava a recomendacao quando o evento RECOMENDACAO_GERADA acontece', async () => {
        const salvar = jest.fn().mockResolvedValue(undefined);
        const observer = new PersistenciaRecomendacao(
            criarRepositorioFalso(salvar)
        );

        const membros = [
            { papel: 'DIRETOR', profissionalId: 'p1', profissionalNome: 'Ana' }
        ];

        observer.atualizar(
            new EventoRecomendacao(
                'RECOMENDACAO_GERADA',
                new Map<string, unknown>([
                    ['projetoId', 'proj-1'],
                    ['equipeId', 'equipe-proj-1'],
                    ['tipoProjeto', 'documentario'],
                    ['membros', membros]
                ]),
                'SistemaRecomendacao'
            )
        );
        await esperarPromessas();

        const esperado: RecomendacaoRegistro = {
            projetoId: 'proj-1',
            equipeId: 'equipe-proj-1',
            tipoProjeto: 'documentario',
            membros
        };
        expect(salvar).toHaveBeenCalledWith(esperado);
    });

    it('usa lista vazia de membros quando o evento nao traz membros', async () => {
        const salvar = jest.fn().mockResolvedValue(undefined);
        const observer = new PersistenciaRecomendacao(
            criarRepositorioFalso(salvar)
        );

        observer.atualizar(
            new EventoRecomendacao(
                'RECOMENDACAO_GERADA',
                new Map<string, unknown>([
                    ['projetoId', 'p'],
                    ['equipeId', 'e']
                ]),
                'SistemaRecomendacao'
            )
        );
        await esperarPromessas();

        expect(salvar).toHaveBeenCalledWith({
            projetoId: 'p',
            equipeId: 'e',
            tipoProjeto: undefined,
            membros: []
        });
    });

    it('ignora eventos que nao sao RECOMENDACAO_GERADA', async () => {
        const salvar = jest.fn().mockResolvedValue(undefined);
        const observer = new PersistenciaRecomendacao(
            criarRepositorioFalso(salvar)
        );

        observer.atualizar(
            new EventoRecomendacao(
                'CONVITE_ACEITO',
                new Map<string, unknown>(),
                'SistemaRecomendacao'
            )
        );
        await esperarPromessas();

        expect(salvar).not.toHaveBeenCalled();
    });

    it('nao propaga o erro quando a gravacao falha', async () => {
        const erroLog = jest
            .spyOn(console, 'error')
            .mockImplementation(() => undefined);
        const observer = new PersistenciaRecomendacao(
            criarRepositorioFalso(
                jest.fn().mockRejectedValue(new Error('banco fora'))
            )
        );

        expect(() =>
            observer.atualizar(
                new EventoRecomendacao(
                    'RECOMENDACAO_GERADA',
                    new Map<string, unknown>([
                        ['projetoId', 'p'],
                        ['equipeId', 'e']
                    ]),
                    'SistemaRecomendacao'
                )
            )
        ).not.toThrow();
        await esperarPromessas();

        expect(erroLog).toHaveBeenCalled();
        erroLog.mockRestore();
    });
});