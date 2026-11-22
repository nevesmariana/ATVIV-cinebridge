import amqp from 'amqplib';

const esperar = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

let conectado = false;
export const rabbitConectado = () => conectado;

export async function conectarRabbitMQ(tentativas = 30) {
    const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

    for (let i = 1; i <= tentativas; i++) {
        try {
            const conexao = await amqp.connect(url);
            const canal = await conexao.createConfirmChannel();

            conectado = true;
            conexao.on('close', () => {
                conectado = false;
                console.error('Conexao com o RabbitMQ foi encerrada');
            });
            conexao.on('error', (e) => console.error('Erro no RabbitMQ:', e.message));

            return { conexao, canal };
        } catch {
            console.log(`Aguardando o RabbitMQ... (${i}/${tentativas})`);
            await esperar(2000);
        }
    }
    throw new Error('Nao foi possivel conectar ao RabbitMQ');
}