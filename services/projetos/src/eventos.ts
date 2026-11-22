import { ConfirmChannel } from 'amqplib';
import { ProjetoDTO } from './repositorio';

export const FILA_EVENTOS = 'eventos-projetos';

export type TipoEvento =
    | 'PROJETO_CRIADO'
    | 'PROJETO_ATUALIZADO'
    | 'PROJETO_FINALIZADO';

export interface EventoProjeto {
    tipo: TipoEvento;
    projetoId: string;
    projeto: ProjetoDTO;
    ocorridoEm: string;
}

export class PublicadorEventos {
    constructor(private readonly canal: ConfirmChannel) { }

    async iniciar(): Promise<void> {
        await this.canal.assertQueue(FILA_EVENTOS, { durable: true });
    }

    publicar(tipo: TipoEvento, projeto: ProjetoDTO): Promise<void> {
        const evento: EventoProjeto = {
            tipo,
            projetoId: projeto.id,
            projeto,
            ocorridoEm: new Date().toISOString()
        };

        return new Promise((resolve, reject) => {
            this.canal.sendToQueue(
                FILA_EVENTOS,
                Buffer.from(JSON.stringify(evento)),
                { persistent: true, contentType: 'application/json' },
                (err) => (err ? reject(err) : resolve())
            );
        });
    }
}