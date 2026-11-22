import { Pool } from 'pg';

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const esperar = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

async function conectarComTentativas(tentativas = 30): Promise<void> {
    for (let i = 1; i <= tentativas; i++) {
        try {
            await pool.query('SELECT 1');
            return;
        } catch {
            console.log(`Aguardando o banco... (${i}/${tentativas})`);
            await esperar(2000);
        }
    }
    throw new Error('Nao foi possivel conectar ao banco de dados');
}

const PROFISSIONAIS_INICIAIS = [
    { id: 'p1', nome: 'Ana Silva', preco: 6000, comp: [['direcao', 9], ['lideranca', 8], ['narrativa', 7]] },
    { id: 'p2', nome: 'Bruno Costa', preco: 3500, comp: [['edicao', 8], ['montagem', 9], ['pos-producao', 7]] },
    { id: 'p3', nome: 'Carla Dias', preco: 2800, comp: [['som', 8], ['mixagem', 7], ['audio', 8]] },
    { id: 'p4', nome: 'Diego Alves', preco: 2000, comp: [['direcao', 5], ['lideranca', 4], ['narrativa', 6]] },
    { id: 'p5', nome: 'Elisa Rocha', preco: 4500, comp: [['fotografia', 9], ['iluminacao', 8], ['enquadramento', 9]] },
    { id: 'p6', nome: 'Felipe Nunes', preco: 3000, comp: [['roteiro', 8], ['narrativa', 9], ['dialogo', 7]] }
];

export async function iniciarBanco(): Promise<void> {
    await conectarComTentativas();

    await pool.query(`
        CREATE TABLE IF NOT EXISTS profissionais (
            id TEXT PRIMARY KEY,
            nome TEXT NOT NULL,
            preco_medio DOUBLE PRECISION NOT NULL,
            disponibilidade_inicio TIMESTAMPTZ NOT NULL,
            disponibilidade_fim TIMESTAMPTZ NOT NULL
        );
        CREATE TABLE IF NOT EXISTS competencias (
            id SERIAL PRIMARY KEY,
            profissional_id TEXT NOT NULL REFERENCES profissionais(id) ON DELETE CASCADE,
            nome TEXT NOT NULL,
            nivel INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS avaliacoes (
            id SERIAL PRIMARY KEY,
            profissional_id TEXT NOT NULL REFERENCES profissionais(id) ON DELETE CASCADE,
            nota DOUBLE PRECISION NOT NULL,
            comentario TEXT NOT NULL,
            data TIMESTAMPTZ NOT NULL
        );
    `);

    const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM profissionais');
    if (rows[0].total > 0) {
        return;
    }

    for (const p of PROFISSIONAIS_INICIAIS) {
        await pool.query(
            `INSERT INTO profissionais
             (id, nome, preco_medio, disponibilidade_inicio, disponibilidade_fim)
             VALUES ($1, $2, $3, '2026-01-01', '2100-12-31')`,
            [p.id, p.nome, p.preco]
        );
        for (const [nome, nivel] of p.comp) {
            await pool.query(
                'INSERT INTO competencias (profissional_id, nome, nivel) VALUES ($1, $2, $3)',
                [p.id, nome, nivel]
            );
        }
    }
    console.log(`Seed concluido: ${PROFISSIONAIS_INICIAIS.length} profissionais inseridos.`);
}