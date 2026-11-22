import { pool } from './db';

export interface MembroRegistro {
    papel: string;
    profissionalId: string;
    profissionalNome: string;
}

export interface RecomendacaoRegistro {
    projetoId: string;
    equipeId: string;
    tipoProjeto?: string;
    membros: MembroRegistro[];
}

export interface RepositorioRecomendacao {
    salvar(registro: RecomendacaoRegistro): Promise<void>;
    listar(): Promise<(RecomendacaoRegistro & { id: number; criadaEm: string })[]>;
}

export class RepositorioRecomendacaoPg implements RepositorioRecomendacao {

    async salvar(registro: RecomendacaoRegistro): Promise<void> {
        await pool.query(
            `INSERT INTO recomendacoes
             (projeto_id, equipe_id, tipo_projeto, membros)
             VALUES ($1, $2, $3, $4::jsonb)`,
            [
                registro.projetoId,
                registro.equipeId,
                registro.tipoProjeto ?? null,
                JSON.stringify(registro.membros)
            ]
        );
    }

    async listar() {
        const { rows } = await pool.query(
            'SELECT * FROM recomendacoes ORDER BY id'
        );
        return rows.map((r) => ({
            id: r.id,
            projetoId: r.projeto_id,
            equipeId: r.equipe_id,
            tipoProjeto: r.tipo_projeto ?? undefined,
            membros: r.membros,
            criadaEm: r.criada_em.toISOString()
        }));
    }
}