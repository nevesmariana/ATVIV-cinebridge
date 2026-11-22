import { RepositorioProfissional } from './RepositorioProfissional';
import { ClienteRPC } from '../mensageria/ClienteRPC';

import { Profissional } from '../domain/Profissional';
import { Competencia } from '../domain/Competencia';
import { Avaliacao } from '../domain/Avaliacao';
import { Intervalo } from '../domain/Intervalo';

const FILA_CONSULTA = 'consulta-profissionais';

interface ProfissionalDTO {
    id: string;
    nome: string;
    precoMedio: number;
    disponibilidadeInicio: string;
    disponibilidadeFim: string;
    competencias: { nome: string; nivel: number }[];
    avaliacoes: { nota: number; comentario: string; data: string }[];
}

export class RepositorioProfissionalRabbitMQ
    implements RepositorioProfissional {

    constructor(
        private readonly cliente: ClienteRPC
    ) { }

    async listarTodos(): Promise<Profissional[]> {
        const dados: ProfissionalDTO[] =
            await this.cliente.consultar(
                FILA_CONSULTA,
                { operacao: 'listarTodos' }
            );

        return dados.map((d) => this.paraDominio(d));
    }

    async buscarPorId(
        id: string
    ): Promise<Profissional | undefined> {
        const dado: ProfissionalDTO | undefined =
            await this.cliente.consultar(
                FILA_CONSULTA,
                { operacao: 'buscarPorId', id }
            );

        return dado ? this.paraDominio(dado) : undefined;
    }

    private paraDominio(dto: ProfissionalDTO): Profissional {
        const profissional = new Profissional(
            dto.id,
            dto.nome,
            dto.competencias.map(
                (c) => new Competencia(c.nome, c.nivel)
            ),
            new Intervalo(
                new Date(dto.disponibilidadeInicio),
                new Date(dto.disponibilidadeFim)
            ),
            dto.precoMedio
        );

        for (const a of dto.avaliacoes) {
            profissional.recebe(
                new Avaliacao(a.nota, a.comentario, new Date(a.data))
            );
        }

        return profissional;
    }
}