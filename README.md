# Devs-Bet

Plataforma de apostas **entre amigos**: você cria uma partida (uma luta, um 1v1 de
videogame, um free-for-all com vários jogadores), os amigos apostam em quem vence, e
quem acerta ganha. Também dá pra abrir uma **enquete** — uma pergunta aberta sobre a
vida real ("quando o fulano vai ser demitido?"), com duas ou mais respostas em que a
galera aposta. O saldo é abastecido via **Pix** e as apostas movimentam esse saldo.

> ⚠️ **Aviso.** Apostas com dinheiro real são atividade **regulada no Brasil**
> (Lei 14.790/2023 — apostas de quota fixa). Este projeto começa em ambiente de
> teste/uso privado; o enquadramento legal para operar com dinheiro real deve ser
> validado com um profissional qualificado antes de qualquer uso em produção.

## Como funciona a aposta (payout parimutuel / "bolão")

Não existe "casa" definindo cotação. As **odds saem da distribuição do dinheiro
apostado** e o azarão paga mais. Exemplo — 10 pessoas apostam R$10 cada, 7 no jogador
A e 3 no B:

- Pool A = R$70 · Pool B = R$30 · Total = R$100
- **B (azarão) vence:** cada R$10 → `10/30 × 100 = R$33,33` (odd ~3,33x)
- **A (favorito) vence:** cada R$10 → `10/70 × 100 = R$14,28` (odd ~1,43x)

Regras: odds ao vivo são **indicativas** e mudam enquanto as apostas estão abertas;
**congelam** quando a partida trava (`locked`); o settlement usa o pool final. Taxa
(rake) configurável, começa em 0%. Ninguém no vencedor → estorna todos. Partida
cancelada → estorna todos.

A mesma matemática vale pros três mercados: **partida** (quem vence o confronto),
**campeão do torneio** (outright) e **enquete** (qual resposta estava certa).

## Enquetes (pergunta aberta)

Nem toda aposta é um confronto. Uma **enquete** é uma pergunta com duas ou mais
respostas — "quando o fulano vai ser demitido?", "o deploy sai hoje?" — e vale como
mercado igual a uma partida: pool parimutuel por resposta, odds ao vivo, múltipla e
comentários embaixo. Sim/Não não é um tipo separado, é só a enquete de duas opções.

O que muda em relação a uma partida é **quem decide o resultado**: aqui não tem placar,
tem alguém lendo o mundo. Por isso toda enquete nasce com um **critério de resolução
escrito** ("vale o anúncio oficial no grupo; pedido de demissão não conta"), visível na
tela, e **a pergunta, o critério e as opções nunca mudam depois de criados** — é o
combinado que a galera aceitou ao apostar. Errou a pergunta? Cancela (todo mundo é
estornado) e abre outra. Só o **prazo** se mexe.

O ciclo é `aberta → fechada → respondida` (ou `cancelada`): as apostas fecham sozinhas
no prazo (job atrasado no worker), e a resposta pode demorar semanas pra aparecer — é
justamente o caso de "quando". Se o mundo nunca responder, o admin cancela e estorna.

## Saldo e Pix (modelo manual)

O dinheiro entra numa **conta única do dono** (admin) e a distribuição é feita por ele:

- **Depósito:** o usuário pede um valor → recebe a chave Pix/QR do dono + um código de
  referência → paga → o **admin confirma** o recebimento → a carteira é creditada.
- **Saque:** o usuário solicita → vira pedido pendente (com hold no saldo) → o admin
  paga manualmente e marca como pago → o saldo é debitado.

Uma porta `PaymentGateway` abstrai isso; hoje o adapter é "manual/admin-confirmado" e
pode ser trocado por um PSP real (Mercado Pago, Efí, Asaas…) sem mexer no domínio.

## Arquitetura

Monorepo Turborepo + npm workspaces, TypeScript, **hexagonal (ports & adapters) por
bounded context**, com **modelagem rica** (entidades com comportamento + value objects;
invariantes no modelo). Contextos: `auth`, `wallet`, `match`, `betting`, `category`,
`participant`, `tournament`, `poll`, `notification`, `comment`.

Deployables de produção: **backend** (API NestJS) e **worker** (settlement assíncrono
via BullMQ). O **web** é o front (Next.js). `database` (Postgres + Redis) sobe via docker
no dev.

## Rodando localmente

Precisa de **Docker** em execução. Copie os `.env.example` (raiz + cada `apps/*`) pra
`.env` e ajuste os valores; um único comando sobe o resto:

```bash
npm install
npm run dev
```

`npm run dev` sobe o Postgres + Redis (docker) e espera ficar pronto, aplica as
migrations pendentes (`prisma migrate deploy`) e inicia backend + worker + web em watch:

- Web: http://localhost:3000
- Backend: http://localhost:5000

O primeiro usuário criado (`/register`) nasce com role `user` — pra testar as telas de
admin (categorias, participantes, partidas/torneios/enquetes, confirmar depósito/saque), promova
manualmente pra `admin` na tabela `users` (ex.: `npx prisma studio --schema
packages/database/prisma/schema.prisma`).

Outros comandos:

```bash
npm run build                        # build de todo o monorepo
npx turbo run check-types test build # valida tudo (tipos, testes, build)
npm run db:stop                      # para os containers de Postgres/Redis
```

Também dá pra rodar o stack inteiro containerizado (backend/worker/web incluídos), útil
pra simular produção: `docker compose up --build` (usa o `docker-compose.yml` da raiz e
o `.env`/`.env` de cada app via `env_file`).

Detalhes de engenharia e regras travadas: veja `CLAUDE.md`.
