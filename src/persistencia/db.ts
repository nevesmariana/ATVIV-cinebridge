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

export async function iniciarBanco(): Promise<void> {
    await conectarComTentativas();

    await pool.query(`
        CREATE TABLE IF NOT EXISTS recomendacoes (
            id SERIAL PRIMARY KEY,
            projeto_id TEXT NOT NULL,
            equipe_id TEXT NOT NULL,
            tipo_projeto TEXT,
            membros JSONB NOT NULL DEFAULT '[]',
            criada_em TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    `);
}

export async function bancoDisponivel(): Promise<boolean> {
    try {
        await pool.query('SELECT 1');
        return true;
    } catch {
        return false;
    }
}