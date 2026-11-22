import { pool } from './db';

export interface ProjetoDTO {
    id: string;
    genero: string;
    duracao: number;
    orcamento: number;
    prazo: string;
    papeisExigidos: { papel: string; peso: number }[];
    status: string;
    criadoEm: string;
    atualizadoEm: string;
}

function paraDTO(r: any): ProjetoDTO {
    return {
        id: r.id,
        genero: r.genero,
        duracao: r.duracao,
        orcamento: r.orcamento,
        prazo: r.prazo.toISOString(),
        papeisExigidos: r.papeis_exigidos,
        status: r.status,
        criadoEm: r.criado_em.toISOString(),
        atualizadoEm: r.atualizado_em.toISOString()
    };
}

export async function criarProjeto(d: any): Promise<ProjetoDTO> {
    const { rows } = await pool.query(
        `INSERT INTO projetos (id, genero, duracao, orcamento, prazo, papeis_exigidos)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)
         RETURNING *`,
        [d.id, d.genero, d.duracao, d.orcamento, d.prazo,
        JSON.stringify(d.papeisExigidos ?? [])]
    );
    return paraDTO(rows[0]);
}

export async function atualizarProjeto(
    id: string,
    d: any
): Promise<ProjetoDTO | undefined> {
    const { rows } = await pool.query(
        `UPDATE projetos SET
            genero = COALESCE($2, genero),
            duracao = COALESCE($3, duracao),
            orcamento = COALESCE($4, orcamento),
            prazo = COALESCE($5, prazo),
            papeis_exigidos = COALESCE($6::jsonb, papeis_exigidos),
            atualizado_em = now()
         WHERE id = $1
         RETURNING *`,
        [id, d.genero ?? null, d.duracao ?? null, d.orcamento ?? null,
            d.prazo ?? null,
            d.papeisExigidos ? JSON.stringify(d.papeisExigidos) : null]
    );
    return rows[0] ? paraDTO(rows[0]) : undefined;
}

export async function finalizarProjeto(
    id: string
): Promise<ProjetoDTO | undefined> {
    const { rows } = await pool.query(
        `UPDATE projetos SET status = 'FINALIZADO', atualizado_em = now()
         WHERE id = $1 RETURNING *`,
        [id]
    );
    return rows[0] ? paraDTO(rows[0]) : undefined;
}

export async function buscarProjeto(
    id: string
): Promise<ProjetoDTO | undefined> {
    const { rows } = await pool.query('SELECT * FROM projetos WHERE id = $1', [id]);
    return rows[0] ? paraDTO(rows[0]) : undefined;
}

export async function listarProjetos(): Promise<ProjetoDTO[]> {
    const { rows } = await pool.query('SELECT * FROM projetos ORDER BY criado_em');
    return rows.map(paraDTO);
}