import { ConfirmChannel } from 'amqplib';
import { RegistradorProjeto } from './RegistradorProjeto';
import { Projeto } from '../domain/Projeto';

export const FILA_REGISTRO_PROJETOS = 'registro-projetos';

export class RegistradorProjetoRabbitMQ implements RegistradorProjeto {
    constructor(
        private readonly canal: ConfirmChannel
    ) { }

    async iniciar(): Promise<void> {
        await this.canal.assertQueue(
            FILA_REGISTRO_PROJETOS,
            { durable: true }
        );
    }

    registrar(projeto: Projeto): Promise<void> {
        const mensagem = {
            id: projeto.id,
            genero: projeto.genero,
            duracao: projeto.duracao,
            orcamento: projeto.orcamento,
            prazo: projeto.prazo.toISOString(),
            papeisExigidos: projeto.exige().map((p) => ({
                papel: p.papel,
                peso: p.peso
            }))
        };

        return new Promise((resolve, reject) => {
            this.canal.sendToQueue(
                FILA_REGISTRO_PROJETOS,
                Buffer.from(JSON.stringify(mensagem)),
                { persistent: true, contentType: 'application/json' },
                (err) => (err ? reject(err) : resolve())
            );
        });
    }
}