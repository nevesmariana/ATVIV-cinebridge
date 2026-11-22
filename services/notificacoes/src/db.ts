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
        CREATE TABLE IF NOT EXISTS notificacoes (
            id SERIAL PRIMARY KEY,
            tipo_evento TEXT NOT NULL,
            projeto_id TEXT NOT NULL,
            canal TEXT NOT NULL,
            destinatario TEXT NOT NULL,
            mensagem TEXT NOT NULL,
            criada_em TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    `);
}