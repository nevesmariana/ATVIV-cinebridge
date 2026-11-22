import { Channel } from 'amqplib';
import { randomUUID } from 'crypto';

export class ClienteRPC {
    constructor(
        private readonly canal: Channel,
        private readonly timeoutMs = 5000
    ) { }

    async consultar(fila: string, mensagem: object): Promise<any> {
        const filaRetorno = `retorno-${randomUUID()}`;
        const correlationId = randomUUID();

        await this.canal.assertQueue(filaRetorno, {
            exclusive: true,
            autoDelete: true
        });

        try {
            const resposta = new Promise<any>((resolve, reject) => {
                const timer = setTimeout(
                    () => reject(new Error(
                        `Tempo esgotado aguardando resposta da fila "${fila}"`
                    )),
                    this.timeoutMs
                );

                this.canal.consume(
                    filaRetorno,
                    (msg) => {
                        if (!msg || msg.properties.correlationId !== correlationId) {
                            return;
                        }
                        clearTimeout(timer);
                        resolve(JSON.parse(msg.content.toString()));
                    },
                    { noAck: true }
                ).catch(reject);
            });

            this.canal.sendToQueue(
                fila,
                Buffer.from(JSON.stringify(mensagem)),
                { replyTo: filaRetorno, correlationId, persistent: true }
            );

            const conteudo = await resposta;

            if (!conteudo.ok) {
                throw new Error(conteudo.erro || 'Erro no servico consultado');
            }
            return conteudo.dados;
        } finally {
            await this.canal.deleteQueue(filaRetorno).catch(() => undefined);
        }
    }
}