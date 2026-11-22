import { pool } from './db';

export interface Notificacao {
    tipoEvento: string;
    projetoId: string;
    canal: 'EMAIL' | 'INTERNA';
    destinatario: string;
    mensagem: string;
}

export async function salvarNotificacao(n: Notificacao): Promise<void> {
    await pool.query(
        `INSERT INTO notificacoes
         (tipo_evento, projeto_id, canal, destinatario, mensagem)
         VALUES ($1, $2, $3, $4, $5)`,
        [n.tipoEvento, n.projetoId, n.canal, n.destinatario, n.mensagem]
    );
}

export async function listarNotificacoes() {
    const { rows } = await pool.query(
        'SELECT * FROM notificacoes ORDER BY id'
    );
    return rows.map((r) => ({
        id: r.id,
        tipoEvento: r.tipo_evento,
        projetoId: r.projeto_id,
        canal: r.canal,
        destinatario: r.destinatario,
        mensagem: r.mensagem,
        criadaEm: r.criada_em.toISOString()
    }));
}