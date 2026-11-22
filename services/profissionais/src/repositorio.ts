import { pool } from './db';

export interface ProfissionalDTO {
    id: string;
    nome: string;
    precoMedio: number;
    disponibilidadeInicio: string;
    disponibilidadeFim: string;
    competencias: { nome: string; nivel: number }[];
    avaliacoes: { nota: number; comentario: string; data: string }[];
}

export async function listarProfissionais(): Promise<ProfissionalDTO[]> {
    const { rows: profs } = await pool.query(
        'SELECT * FROM profissionais ORDER BY id'
    );
    const { rows: comps } = await pool.query(
        'SELECT profissional_id, nome, nivel FROM competencias'
    );
    const { rows: avals } = await pool.query(
        'SELECT profissional_id, nota, comentario, data FROM avaliacoes'
    );

    return profs.map((p) => ({
        id: p.id,
        nome: p.nome,
        precoMedio: p.preco_medio,
        disponibilidadeInicio: p.disponibilidade_inicio.toISOString(),
        disponibilidadeFim: p.disponibilidade_fim.toISOString(),
        competencias: comps
            .filter((c) => c.profissional_id === p.id)
            .map((c) => ({ nome: c.nome, nivel: c.nivel })),
        avaliacoes: avals
            .filter((a) => a.profissional_id === p.id)
            .map((a) => ({
                nota: a.nota,
                comentario: a.comentario,
                data: a.data.toISOString()
            }))
    }));
}

export async function buscarProfissionalPorId(
    id: string
): Promise<ProfissionalDTO | undefined> {
    const todos = await listarProfissionais();
    return todos.find((p) => p.id === id);
}