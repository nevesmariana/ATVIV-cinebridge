import amqp from 'amqplib';
import { randomUUID } from 'crypto';

async function main() {
    const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
    const conexao = await amqp.connect(url);
    const canal = await conexao.createChannel();

    const filaRetorno = `retorno-${randomUUID()}`;
    await canal.assertQueue(filaRetorno, { exclusive: true, autoDelete: true });

    const correlationId = randomUUID();

    await canal.consume(filaRetorno, (msg) => {
        if (!msg || msg.properties.correlationId !== correlationId) return;
        const resposta = JSON.parse(msg.content.toString());
        console.log('Resposta recebida:', resposta.ok ? 'OK' : 'ERRO');
        if (resposta.ok) {
            console.log(`${resposta.dados.length} profissionais:`);
            resposta.dados.forEach((p: any) => console.log(` - ${p.id} ${p.nome}`));
        } else {
            console.log(resposta.erro);
        }
        conexao.close();
    }, { noAck: true });

    canal.sendToQueue(
        'consulta-profissionais',
        Buffer.from(JSON.stringify({ operacao: 'listarTodos' })),
        { replyTo: filaRetorno, correlationId, persistent: true }
    );
    console.log('Consulta enviada, aguardando resposta...');
}

main().catch((e) => { console.error(e); process.exit(1); });