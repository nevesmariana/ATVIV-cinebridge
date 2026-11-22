import { Notificacao, salvarNotificacao } from './repositorio';

export interface EventoProjeto {
    tipo: 'PROJETO_CRIADO' | 'PROJETO_ATUALIZADO' | 'PROJETO_FINALIZADO';
    projetoId: string;
    projeto: {
        id: string;
        genero: string;
        orcamento: number;
        status: string;
    };
    ocorridoEm: string;
}

export interface Observador {
    notificar(evento: EventoProjeto): Promise<void>;
}

export class DespachanteEventos {
    private readonly observadores: Observador[] = [];

    registrar(observador: Observador): void {
        this.observadores.push(observador);
    }

    async emitir(evento: EventoProjeto): Promise<void> {
        for (const observador of this.observadores) {
            await observador.notificar(evento);
        }
    }
}

function montarMensagem(evento: EventoProjeto): string {
    const p = evento.projeto;
    switch (evento.tipo) {
        case 'PROJETO_CRIADO':
            return `Projeto ${p.id} (${p.genero}) foi criado com orcamento de R$ ${p.orcamento.toFixed(2)}.`;
        case 'PROJETO_ATUALIZADO':
            return `Projeto ${p.id} foi atualizado. Orcamento atual: R$ ${p.orcamento.toFixed(2)}.`;
        case 'PROJETO_FINALIZADO':
            return `Projeto ${p.id} foi finalizado.`;
    }
}

export class NotificadorEmail implements Observador {
    async notificar(evento: EventoProjeto): Promise<void> {
        const notificacao: Notificacao = {
            tipoEvento: evento.tipo,
            projetoId: evento.projetoId,
            canal: 'EMAIL',
            destinatario: 'produtor@cinebridge.local',
            mensagem: montarMensagem(evento)
        };
        console.log(`[EMAIL] para ${notificacao.destinatario}: ${notificacao.mensagem}`);
        await salvarNotificacao(notificacao);
    }
}

export class NotificadorInterno implements Observador {
    async notificar(evento: EventoProjeto): Promise<void> {
        const notificacao: Notificacao = {
            tipoEvento: evento.tipo,
            projetoId: evento.projetoId,
            canal: 'INTERNA',
            destinatario: `equipe-${evento.projetoId}`,
            mensagem: montarMensagem(evento)
        };
        console.log(`[INTERNA] para ${notificacao.destinatario}: ${notificacao.mensagem}`);
        await salvarNotificacao(notificacao);
    }
}