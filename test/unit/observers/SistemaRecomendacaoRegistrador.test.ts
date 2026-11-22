import { SistemaRecomendacao } from '../../../src/observers/SistemaRecomendacao';
import { OrquestradorPadrao } from '../../../src/orchestration/OrquestradorPadrao';
import { RepositorioProfissional } from '../../../src/repositories/RepositorioProfissional';
import { RegistradorProjeto } from '../../../src/integracao/RegistradorProjeto';
import { SimilaridadeCosseno } from '../../../src/strategies/SimilaridadeCosseno';

import { Profissional } from '../../../src/domain/Profissional';
import { Competencia } from '../../../src/domain/Competencia';
import { Intervalo } from '../../../src/domain/Intervalo';
import { Projeto } from '../../../src/domain/Projeto';
import { Papel } from '../../../src/domain/Papel';

class RepositorioFalso implements RepositorioProfissional {
    constructor(private readonly profissionais: Profissional[]) { }

    async listarTodos() {
        return this.profissionais;
    }

    async buscarPorId(id: string) {
        return this.profissionais.find((p) => p.id === id);
    }
}

function criarSistema(): SistemaRecomendacao {
    const candidato = new Profissional(
        'p1',
        'Candidato',
        [new Competencia('direcao', 8)],
        new Intervalo(new Date('2026-01-01'), new Date('2100-12-31')),
        1000
    );

    return new SistemaRecomendacao(
        new OrquestradorPadrao(new RepositorioFalso([candidato])),
        new SimilaridadeCosseno()
    );
}

function criarProjeto(): Projeto {
    return new Projeto(
        'proj-1',
        'doc',
        60,
        5000,
        new Date('2035-01-01'),
        [{ papel: Papel.DIRETOR, peso: 1 }]
    );
}

describe('SistemaRecomendacao (registro do projeto)', () => {
    it('registra o projeto depois de gerar a recomendacao', async () => {
        const sistema = criarSistema();
        const registrador: RegistradorProjeto = {
            registrar: jest.fn().mockResolvedValue(undefined)
        };
        sistema.definirRegistradorProjeto(registrador);

        const projeto = criarProjeto();
        await sistema.executarRecomendacao(projeto);

        expect(registrador.registrar).toHaveBeenCalledTimes(1);
        expect(registrador.registrar).toHaveBeenCalledWith(projeto);
    });

    it('nao perde a recomendacao se o registro falhar', async () => {
        const sistema = criarSistema();
        const erroLog = jest
            .spyOn(console, 'error')
            .mockImplementation(() => undefined);

        sistema.definirRegistradorProjeto({
            registrar: jest.fn().mockRejectedValue(new Error('mq fora'))
        });

        const equipe = await sistema.executarRecomendacao(criarProjeto());

        expect(equipe.contem()).toHaveLength(1);
        expect(erroLog).toHaveBeenCalled();
        erroLog.mockRestore();
    });

    it('funciona normalmente sem registrador configurado', async () => {
        const sistema = criarSistema();

        const equipe = await sistema.executarRecomendacao(criarProjeto());

        expect(equipe.contem()).toHaveLength(1);
    });
});