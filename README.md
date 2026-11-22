# Cinebridge: Recomendação e Orquestração de Equipes

Plataforma que recomenda e monta equipes técnicas para projetos audiovisuais independentes. Recebe um projeto (gênero, orçamento, prazo e papéis exigidos), consulta os profissionais cadastrados e devolve uma equipe sugerida.

O sistema roda como **4 microsserviços em containers Docker** (API, profissionais, projetos e notificações), que se comunicam pelo RabbitMQ e têm um banco PostgreSQL cada. A lógica de recomendação, baseada em padrões de projeto, fica no `cinebridge-api`.

## Stack técnica

| Tecnologia | Versão |
|---|---|
| Docker | Docker Desktop (Windows 10 ou superior) ou Docker Engine com o plugin Compose (Ubuntu 24.04 ou superior) |
| Imagem dos serviços | `node:18-alpine` |
| PostgreSQL (containers) | 15 (`postgres:15-alpine`) |
| RabbitMQ (container) | 3 (`rabbitmq:3-management-alpine`, executado com a 3.13.7) |
| Fastify | 5.x |
| amqplib / pg | 0.10.x / 8.x |
| TypeScript (modo estrito) | 5.9.3 |
| Jest / ts-jest / tsx | 30.5.2 / 29.4.14 / 4.23.15 |
| Node.js local (só para testes e demonstração) | LTS, testado com 24.14.0 |

As versões dos pacotes npm ficam fixadas no `package-lock.json` de cada serviço. O Prisma (`prisma/`) pertence ao modelo anterior ao Docker e não é usado na execução com os containers.

## Atividade 4: Containerização (Docker, RabbitMQ e microsserviços)

O sistema roda em **9 containers** ligados pela rede `cinebridge-net`. Os serviços não se chamam por HTTP: conversam por **filas do RabbitMQ**, e cada serviço tem o seu próprio banco PostgreSQL.

| Container | Porta | Papel | Banco (porta no host) |
|---|---|---|---|
| `cinebridge-api` | 3000 | Recomendação e orquestração de equipes (padrões de projeto descritos abaixo) | `recomendacoes-db` (5434) |
| `cinebridge-profissionais` | 3001 | Cadastro e consulta de profissionais | `profissionais-db` (5432) |
| `cinebridge-projetos` | 3002 | Ciclo de vida dos projetos | `projetos-db` (5433) |
| `cinebridge-notificacoes` | 3003 | Envio de notificações | `notificacoes-db` (5435) |
| `cinebridge-mq` | 5672 / 15672 | RabbitMQ (painel em `http://localhost:15672`, login `guest` / `guest`) | não tem |

Dentro da rede, todos os bancos usam a porta 5432. As portas diferentes só existem para os bancos não conflitarem no host.

### Fluxo de uma recomendação

1. `POST /recomendacoes` chega na API.
2. A API pergunta os profissionais ao serviço `cinebridge-profissionais` pela fila `consulta-profissionais`. A resposta volta por uma fila de retorno com nome único, com tempo limite de 5 segundos (`RepositorioProfissionalRabbitMQ`).
3. A API monta a equipe e o observer `PersistenciaRecomendacao` grava a recomendação no `recomendacoes-db`.
4. A API publica o projeto na fila `registro-projetos` (`RegistradorProjetoRabbitMQ`). Se essa publicação falhar, a recomendação não se perde.
5. O serviço `cinebridge-projetos` consome `registro-projetos`, grava o projeto e publica um evento (`PROJETO_CRIADO` ou `PROJETO_ATUALIZADO`) na fila `eventos-projetos`.
6. O serviço `cinebridge-notificacoes` consome `eventos-projetos`. Um `DespachanteEventos` (padrão Observer) avisa o `NotificadorEmail` e o `NotificadorInterno`, e as notificações são gravadas no `notificacoes-db`.

Todas as filas são duráveis, as mensagens são persistentes e há confirmação de entrega (`ack` nos consumidores e canal com confirmação nos publicadores).

### Endpoints de apoio

| Serviço | Endpoints |
|---|---|
| API (3000) | `POST /recomendacoes`, `POST /recomendacoes/:tipo`, `GET /recomendacoes`, `GET /health` |
| Profissionais (3001) | `GET /profissionais`, `GET /health` |
| Projetos (3002) | `POST /projetos`, `PUT /projetos/:id`, `POST /projetos/:id/finalizar`, `GET /projetos`, `GET /projetos/:id`, `GET /health` |
| Notificações (3003) | `GET /notificacoes`, `GET /health` |

### Health checks

Todos os serviços expõem `/health` (retorna 200 só se o banco e o RabbitMQ estiverem acessíveis) e o `docker-compose.yml` define `healthcheck` em todos os containers (`pg_isready` nos bancos, `rabbitmq-diagnostics ping` no RabbitMQ). Cada serviço só inicia depois que o banco e o RabbitMQ estão saudáveis.

### Como verificar o sistema completo

```bash
docker compose up -d --build
docker compose ps
curl -X POST http://localhost:3000/recomendacoes -H "Content-Type: application/json" -d @scripts/body-recomendacao.json
```

Depois de alguns segundos, confira:

- `http://localhost:3002/projetos`: projeto registrado.
- `http://localhost:3003/notificacoes`: notificações geradas.
- `http://localhost:3000/recomendacoes`: recomendação gravada.
- `http://localhost:15672`: filas `consulta-profissionais`, `registro-projetos` e `eventos-projetos`.

### Comandos úteis

```bash
docker compose logs -f              # acompanhar os logs
docker compose down                 # desligar (mantém os dados)
docker compose down -v              # desligar e apagar os dados
docker compose up -d --build        # ligar tudo (sempre sem nomes de serviço)
```

### Plataformas

Os containers são Linux (Alpine), então o procedimento é o mesmo no Windows 10 ou superior (Docker Desktop com WSL 2) e no Ubuntu 24.04 ou superior e derivados (Docker Engine com o plugin Compose). Em máquinas com PostgreSQL local, as portas 5432 a 5435 podem estar ocupadas: nesse caso, altere só o número da esquerda no `ports` do `docker-compose.yml`. Em instalações antigas do Compose, use `docker-compose` (com hífen) no lugar de `docker compose`.

### Decisões e adaptações em relação ao enunciado

- **Imagem `node:18-alpine`**, como pede o enunciado. O Fastify 5 recomenda oficialmente Node 20 ou superior, mas o sistema e a suíte de testes foram executados no Node 18 sem problemas.
- **Health check com `wget`** em vez de `curl`, porque a imagem Alpine já traz o `wget`, e com `127.0.0.1` para evitar problemas de resolução de `localhost` em IPv6.
- **Serviços novos usam o driver `pg`** (e não o Prisma) para acessar o PostgreSQL. A API usa o mesmo driver para gravar as recomendações. O Prisma (`prisma/` e `RepositorioProfissionalPrisma`) permanece no projeto, mas a execução via Docker não o utiliza.
- **O e-mail é simulado**: o `NotificadorEmail` escreve no log e grava a notificação no banco, sem enviar e-mail de verdade.
- **Credenciais fixas de desenvolvimento** (`postgres` / `postgres` e `guest` / `guest`). Em produção devem vir de variáveis de ambiente ou de um gerenciador de segredos.
- **Sem reconexão automática**: se o RabbitMQ cair e voltar, os serviços ficam com `/health` em 503 até serem reiniciados (`docker compose restart`).

## Como rodar

### 1. Pré-requisitos

- Docker Desktop (Windows 10 ou superior) ou Docker Engine com o plugin Compose (Ubuntu 24.04 ou superior)
- Node.js LTS (só para rodar os testes e a demonstração de console)

### 2. Clonar o repositório

```bash
git clone https://github.com/nevesmariana/ATVIV-cinebridge.git
cd ATVIV-cinebridge
```

O Docker instala as dependências dentro das imagens, então o `npm install` abaixo só é necessário para rodar os testes e a demonstração de console (passos 5 e 6):

```bash
npm install
```

### 3. Subir o sistema com Docker

```bash
docker compose up -d --build
docker compose ps
```

Aguarde até os 9 containers aparecerem como `(healthy)` (1 a 2 minutos na primeira vez). A API fica em `http://localhost:3000`. Veja a seção "Atividade 4" acima para os detalhes da arquitetura.

### 4. Testar as rotas de recomendação

**Rota com estratégia escolhida manualmente** — `POST /recomendacoes`:

```bash
curl -X POST http://localhost:3000/recomendacoes \
  -H "Content-Type: application/json" \
  -d '{"projeto":{"id":"proj-1","genero":"documentario","duracao":90,"orcamento":30000,"prazo":"2035-01-01","papeisExigidos":[{"papel":"DIRETOR","peso":1},{"papel":"EDITOR","peso":0.8},{"papel":"SONOPLASTA","peso":0.6}]},"estrategia":"similaridadeCosseno"}'
```

**Rota por gênero** — `POST /recomendacoes/:tipo`, a fábrica do gênero escolhe tudo sozinha:

```bash
curl -X POST http://localhost:3000/recomendacoes/documentario \
  -H "Content-Type: application/json" \
  -d '{"dados":{"id":"doc-1","genero":"documentario","duracao":60,"orcamento":20000,"prazo":"2035-01-01","papeisExigidos":[{"papel":"DIRETOR","peso":1},{"papel":"EDITOR","peso":0.8}],"tema":"cultura nordestina","entrevistados":["Maria","Joao"]}}'
```

Troque `/documentario` por `/animacao` ou `/publicitario` (ajustando os campos extras de `dados` conforme a tabela de gêneros abaixo).

Windows (cmd), mesma ideia com aspas escapadas:

```bat
curl -X POST http://localhost:3000/recomendacoes/documentario ^
  -H "Content-Type: application/json" ^
  -d "{\"dados\":{\"id\":\"doc-1\",\"genero\":\"documentario\",\"duracao\":60,\"orcamento\":20000,\"prazo\":\"2035-01-01\",\"papeisExigidos\":[{\"papel\":\"DIRETOR\",\"peso\":1},{\"papel\":\"EDITOR\",\"peso\":0.8}],\"tema\":\"cultura nordestina\",\"entrevistados\":[\"Maria\",\"Joao\"]}}"
```

### 5. Rodar a demonstração no console

```bash
npm run dev
```

### 6. Rodar os testes

```bash
npm test
```

## Padrões de projeto aplicados

| Padrão | Localização | Papel |
|---|---|---|
| Strategy | `src/strategies/` | Troca o algoritmo de recomendação (similaridade de cosseno, filtragem colaborativa, regras de orçamento) sem alterar o restante do fluxo |
| Template Method | `src/orchestration/` | Fixa o esqueleto da orquestração (validar restrições, normalizar dados, recomendar, pós-processar), delegando os passos específicos às subclasses |
| Observer | `src/observers/` | Notifica vários interessados (e-mail, mensagem interna, auditoria, gravação da recomendação no banco) a cada recomendação, sem acoplar o sistema a cada um. O serviço de notificações usa o mesmo padrão para reagir aos eventos dos projetos (`DespachanteEventos`) |
| Visitor | `src/visitors/` | Executa operações transversais (validação de consistência, cálculo de compatibilidade, relatório) sobre `Projeto` e `Profissional`, sem poluir essas classes |
| Prototype | `src/domain/Projeto.ts` + subclasses | `clonar()` devolve uma cópia profunda e independente de um projeto, preservando o tipo concreto (`ProjetoDocumentario`, `ProjetoAnimacao`, `ProjetoPublicitario`) |
| Factory Method | `src/factories/<genero>/` | Cada fábrica concreta decide COMO construir o recomendador, o validador e o notificador do seu próprio gênero |
| Abstract Factory | `src/factories/FabricaProjeto.ts` + fábricas concretas | Garante que validador, recomendador e notificador de um mesmo projeto pertençam sempre à MESMA família (gênero), nunca misturados |
| Adapter | `src/adapters/` + `src/externos/` | Isola o núcleo dos serviços de terceiros (armazenamento, pagamento, cadastro de profissionais): cada provedor ganha um adaptador que traduz a interface padrão para a API dele |
| Composite | `src/servicos/` | Representa pacotes de serviços dentro de pacotes (árvore). Serviço atômico e pacote compartilham a interface `ServicoProjeto`, então custo, prazo e validação são calculados recursivamente |
| Decorator | `src/decorators/` | Acrescenta cache, auditoria e compressão ao recomendador, em camadas e em qualquer ordem, sem alterar o recomendador nem o `SistemaRecomendacao` |

### Gêneros de projeto (Abstract Factory, seleção automática — rota `/recomendacoes/:tipo`)

| Gênero | Fábrica | Campos extras | Regra de recomendação específica | Regra de validação específica |
|---|---|---|---|---|
| `documentario` | `FabricaDocumentario` | `tema`, `entrevistados` | Prioriza quem tem competência de `entrevista` no papel de Diretor | Reprova se não houver nenhum entrevistado definido |
| `animacao` | `FabricaAnimacao` | `motorGrafico`, `resolucaoEntrega` | Prioriza quem tem competência de `modelagem3d` no papel de Efeitos Visuais | Reprova se o motor gráfico não estiver definido |
| `publicitario` | `FabricaPublicitario` | `cliente`, `plataformasDistribuicao` | Prioriza quem tem competência de `motion-graphics` no papel de Editor | Reprova se faltar cliente ou plataforma de distribuição |

### Adapter: provedores externos simulados

O `SistemaRecomendacao` depende apenas das interfaces. Os provedores são trocados com `configurarAdaptadores(armazenamento, pagamento, profissional)`, sem alterar a lógica de negócio.

| Interface | Adaptadores | Sistema externo simulado | O que o adaptador traduz |
|---|---|---|---|
| `AdaptadorArmazenamento` | `AdaptadorS3`, `AdaptadorGoogleCloud` | `S3Simulado`, `GoogleCloudStorageSimulado` | `salvarArquivo` vira `putObject` ou `file().save()` |
| `AdaptadorPagamento` | `AdaptadorStripe`, `AdaptadorPagSeguro` | `StripeSimulado`, `PagSeguroSimulado` | Reais viram centavos (Stripe) ou texto `"150.00"` (PagSeguro); os status viram `APROVADO`, `ESTORNADO` ou `NAO_ENCONTRADO` |
| `AdaptadorProfissional` | `AdaptadorLinkedIn`, `AdaptadorInterno` | `LinkedInSimulado`, `CadastroInternoSimulado` | Perfis externos viram objetos `Profissional` do domínio |

### Composite: hierarquia de serviços

`Projeto` possui `servicoPrincipal` (tipo `ServicoProjeto`). `calcularCustoTotal()` e `validarEstrutura()` delegam à árvore, e `exige()` deriva os papéis a partir dela. Um projeto também pode ser criado com uma lista simples de papéis, que é convertida em árvore automaticamente, e `clonar()` copia a árvore inteira.

```ts
const posProducao = new PacoteServico('Pos-producao')
    .adicionar(new ServicoAtomico('Edicao', 5000, 10, Papel.EDITOR, 2))
    .adicionar(
        new PacoteServico('Audio').adicionar(
            new ServicoAtomico('Mixagem', 3000, 5, Papel.SONOPLASTA)
        )
    );

posProducao.calcularCusto(); // 8000
posProducao.obterPrazo();    // 15 (dias, em sequência)
```

### Decorator: cache, auditoria e compressão

A pilha é montada em tempo de execução. A ordem da lista vai do mais interno para o mais externo:

```ts
const pilha = montarPilhaRecomendador(
    new RecomendadorBase(),
    ['cache', 'auditoria', 'compressao']
);
sistema.definirEstrategia(pilha.topo);
```

A ordem muda o comportamento: com `cache,auditoria` a auditoria registra todas as chamadas, e com `auditoria,cache` ela registra só as que o cache não resolveu.

A demonstração do console lê a pilha da variável de ambiente `CINEBRIDGE_DECORADORES`:

```bash
# Linux / macOS
CINEBRIDGE_DECORADORES=cache,auditoria npm run dev

# Windows (cmd)
set CINEBRIDGE_DECORADORES=cache,auditoria
npm run dev

# Windows (PowerShell)
$env:CINEBRIDGE_DECORADORES="cache,auditoria"
npm run dev
```

Valores aceitos: `cache`, `auditoria` e `compressao`. Nomes desconhecidos ou repetidos geram erro.