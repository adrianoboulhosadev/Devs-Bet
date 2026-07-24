# CLAUDE.md — guia de engenharia do Devs-Bet

Instruções e padrões deste monorepo. **Siga à risca** — estas decisões estão travadas.
Para contexto de produto, veja o `README.md`.

> **Idioma do código: INGLÊS.** O projeto inteiro é em inglês — tabelas/colunas do banco,
> arquivos, pastas, tipos, funções, variáveis, rotas, códigos de erro e comentários. **Nada de
> português no código.** Este guia (CLAUDE.md) e as mensagens de commit ficam em PT.

## Duas bases de referência

Este projeto nasce cruzando dois repositórios já validados:

- **Brainy-Career** → **estrutura e convenções**: monorepo Turborepo, pacotes por bounded
  context (`packages/<ctx>/{core,adapters}`), `shared`/`database` separados, CQRS, portas,
  driven adapters no app, `DomainExceptionFilter` global, JWT stateful, worker BullMQ,
  kebab-case, código em inglês.
- **Zod-Help-Desk** → **modelagem rica**: entidade-base, value objects, invariantes no modelo,
  reconstituição no repositório.

Devs-Bet = **estrutura do Brainy + modelagem rica do Zod**. Onde os dois divergem, vale o que
está escrito aqui.

## Visão geral

Monorepo **Turborepo + npm workspaces** em TypeScript. Arquitetura **hexagonal (ports & adapters)
por bounded context**, com **modelagem RICA** (entidades com comportamento e invariantes + value
objects; regras de negócio moram no modelo, não nos casos de uso).

Contextos de domínio: `auth`, `wallet`, `match`, `betting`, `category`. O `auth` é a **referência canônica**
de fiação (core → adapters → backend). Fluxo do produto: usuário deposita saldo (Pix, manual) →
cria/entra numa partida (`match`) entre jogadores → aposta (`bet`) em quem vence → quando o
resultado sai, o settlement paga os vencedores (parimutuel).

**Deployables de produção: 2** — `backend` (API web) e `worker` (settlement assíncrono). O `web`
é o front. O `database`/Redis sobem via docker no dev.

## Estrutura

```
packages/
  shared/                              # kernel: Id, Entity, Money (value object), UseCase, Validator, DomainError, Errors
  database/  (database)                # Prisma: schema + client gerado; exporta o PrismaClient compartilhado
  <contexto>/
    core/      (@<contexto>/core)      # src/{model,providers,use-cases,domain-services} + index.ts; test/ irmão de src/
    adapters/  (@<contexto>/adapters)  # src/{controllers,facade,dto,@types,providers} + index.ts (sem testes)
apps/
  backend/   # NestJS: API. Driven adapters (repos Prisma, bcrypt, jwt, payment gateway), middleware, controllers, produtor BullMQ.
  worker/    # consumidor BullMQ que roda o SettleMatch (paga/estorna as apostas). Tem testes. NÃO usa Groq/Playwright.
  web/       # Next.js (App Router) + Tailwind + TanStack Query + Axios + react-hook-form.
  database/  (container-db)            # docker-compose: Postgres + Redis (dev)
```

Contextos e scopes: `@auth/*`, `@wallet/*`, `@match/*`, `@betting/*`, `@category/*`. `core` e `adapters` são
**pacotes separados**. Workspaces: `["apps/*","packages/shared","packages/database","packages/*/core","packages/*/adapters"]`.

## Modelagem rica (TRAVADA) — a diferença central

O `model/` NÃO é anêmico. Regras vivem no modelo:

- **Value Objects (VO)**: classe pequena que encapsula um conceito com regra própria (ex.: `Money`,
  `Stake`, `Odd`, `Email`, `StrongPassword`). Padrão:
  - **valida no construtor** e lança erro tipado (`ValidationError.throwError(...)`) se inválido;
  - expõe o dado por `value` (ou getters derivados, ex.: `email.domain`);
  - regex/limites são `static readonly` **dentro do VO**;
  - é **imutável** (`readonly`); operações devolvem novo VO (ex.: `money.add(other)` retorna `Money`).
- **Entity base** (`Entity<T, Props>` no `shared`): carrega `id: Id` + `props`, com `equals`/`clone`.
  As entidades estendem ela.
- **Entidades ricas**: agregam VOs e **comportamento com invariantes**. O construtor recebe `Props`
  (com `id?` opcional — ausência = entidade nova), monta os VOs e **rejeita estados inválidos**
  (ex.: `Wallet` nunca com saldo negativo; `Match.settle` só se `locked`). Métodos mutadores
  aplicam a transição validando a regra (ex.: `wallet.hold(stake)` lança `INSUFFICIENT_BALANCE`).
- **Use-cases orquestram, não regram**: um caso de uso carrega a(s) entidade(s) pela porta,
  chama métodos do domínio (que se autovalidam) e persiste. Nada de regra de negócio solta no
  use-case — se você está escrevendo um `if` de regra no use-case, ele provavelmente pertence a
  um VO ou entidade.
- **Reconstituição no repositório**: o repo (Prisma e fakes) **reconstitui** a entidade via
  construtor a partir da linha (`new Wallet({ id, balance, ... })`) e **serializa** lendo os VOs
  (`wallet.balance.value`). Sem helpers `toDTO/toDomain` genéricos — montagem **inline**, como no
  Brainy. Use Prisma **tipado** (nada de `$queryRaw`/INSERT cru).
- **CQRS mantido**: o lado de **leitura** continua devolvendo **DTO plano** (interface simples, sem
  entidade), montado direto da query. Entidade rica só no lado de **escrita**.

## Regras de arquitetura (TRAVADAS)

- **Casos de uso**: um por arquivo, `export default class implements UseCase<INPUT, OUTPUT>` com
  método público `execute`, dependências injetadas pelo **construtor** (DI manual). Constantes/regex
  de regra ficam **no VO/entidade**; nada de arquivos `validations.ts`.
- **CQRS**: porta de escrita `<X>Repository` + porta de leitura `<X>QueryRepository` (retorna DTO).
  **Comandos (create/update/place/settle/deposit/withdraw…) retornam `Promise<void>`**; só os casos
  de uso de leitura (`...Query`) retornam DTO.
- **Ports** = interfaces em `core/src/providers`. **Driven adapters** (repos Prisma, bcrypt, jwt,
  payment gateway, fila) ficam **no APP que consome a porta** (`apps/backend` e/ou `apps/worker`),
  nunca nos pacotes de contexto. A **única infra compartilhada** é o `PrismaClient`, em `packages/database`.
- **App NUNCA importa `@ctx/core` — só `@ctx/adapters`.** O `@ctx/adapters` é a **única superfície
  pública** do contexto e reexporta (curado) DTOs, portas, **entidades/VOs/enums** e tipos de infra.
  **Só o pacote `adapters` importa o `core`.** Rodar um use-case a partir do app é sempre via
  controller/facade do adapters (ex.: o worker chama `BettingFacade.settleMatch`, nunca `new SettleMatch`).
- **`core` só depende de `shared`** (e `uuid`, via shared). **Proibido**: Zod ou qualquer outra lib
  no core. Validação usa `Validator`/`ValidationError`/`Errors` do `shared`.
- **Adapters**: `controllers/` são presenters finos (instanciam o use-case e devolvem só o que o
  front precisa); `facade/` é a entrada única que o app chama (ports **opcionais** no construtor).
- **Controllers do backend (Nest)** montam a Facade num helper `private facade()` que injeta os
  driven adapters uma vez; cada rota chama `this.facade().xxx(...)`.
- **Domain services**: regras puras que cruzam entidades (ex.: `PayoutCalculator` do parimutuel,
  agregações de stats) → classe em `core/src/domain-services/` com métodos **estáticos**, sem portas
  e sem efeito. Reexportada como **valor** pelo `@ctx/adapters`.
- **Autorização por caso de uso (role)**: casos de uso restritos a admin **estendem** a base
  `AdminUseCase<INPUT, OUTPUT>` (do `shared`) em vez de implementar `UseCase` direto. É um Template
  Method: o `execute` público checa `actor.role === 'admin'` (senão `AccessDeniedError`/`NOT_ADMIN`)
  e delega pro `executeAsAdmin`. O `actor` (`AuthenticatedActor { id, role }`, também no `shared`) é
  resolvido do JWT pelo backend e passado ao use-case. Autorização fica em **duas camadas**: guard de
  role no backend (borda) + a base no domínio. O `shared` **não** importa nenhum contexto — por isso
  a base usa `AuthenticatedActor` (id+role), não a entidade `User`.
- **Fronteiras**: contextos se tocam **só por portas**, nunca import direto entre cores. Orquestração
  cross-context (ex.: `PlaceBet` toca `wallet` + `match` + `betting`) fica na camada de app (backend).
  Limites: `auth`=identidade/credencial/role; `wallet`=saldo/ledger/depósito/saque;
  `match`=partidas/participantes/resultado; `betting`=apostas/odds/settlement/stats;
  `category`=árvore de categorias das partidas.
- **Categoria da partida (cross-context)**: o `match` guarda `categoryId` (folha da árvore) como
  dado puro; a validação "existe + é folha" segue o padrão do `PlaceBet` — o **backend resolve** via
  `category` (`findByIdQuery` → `isLeaf`) e passa `categoryIsLeaf` pro use-case do match (que lança
  `CATEGORY_NOT_LEAF`). O match **não** importa o `category`.

## Dinheiro, transações e atomicidade

- **Dinheiro em centavos** (`Int`), nunca float. O VO `Money` (no `shared`) encapsula centavos + BRL
  e as operações (`add`/`subtract`/`isNegative`/`isGreaterThan`); colunas Prisma em `Int`.
- **Operações de dinheiro são atômicas.** Apostar = `wallet.hold(stake)` + criar `Bet` + registrar no
  ledger num **único commit**; settlement = pagar N apostas + creditar/consumir N carteiras de uma vez.
  A **porta expõe a operação composta** (ex.: `BettingRepository.placeBet(...)`, `settleMatch(...)`) e o
  **adapter Prisma envolve em `$transaction`**. O core não conhece Prisma; a atomicidade é do adapter.
- **Ledger append-only**: toda mudança de saldo gera um `LedgerEntry` (deposit, bet_hold, bet_won,
  bet_lost, refund, withdrawal). Fonte de auditoria — nunca editar/apagar linha de ledger.

## Payout parimutuel

Domain service `PayoutCalculator.calculate(bets, winnerParticipantId, rakeBasisPoints)` (puro/estático):

- `pool(participant)` = soma dos stakes naquele participante; `total` = soma de todos.
- `distributable = total − rake` (`rake = total × rakeBasisPoints / 10000`; começa em 0).
- Aposta vencedora `i` recebe `stake_i / pool(winner) × distributable`. Odd implícita do vencedor =
  `distributable / pool(winner)` → quanto menor o pool, maior o pagamento (azarão paga mais).
- `pool(winner) == 0` (ninguém acertou) → **estorna todos**. Partida cancelada → **estorna todos**.
- Odds ao vivo (read model) são **indicativas** enquanto `open`; congelam no `locked`; settlement usa
  o pool final.

## Erros de domínio

Use-cases, VOs e entidades lançam erros **tipados** do `shared` (base `DomainError`, com
`code`/`value`/`extras` + `throwError`/`create`). O domínio **não conhece HTTP** — quem traduz
tipo → status é o `DomainExceptionFilter` (global, em `apps/backend/src/shared`), por `instanceof`:

| Erro (shared) | HTTP | Quando |
|---|---|---|
| `ValidationError` | 400 | entrada/regra de formato; **único acumulável** via `Validator.combineErrors` |
| `UnauthorizedError` | 401 | credencial inválida / não autenticado |
| `AccessDeniedError` | 403 | autenticado, sem permissão (anti-IDOR; role admin) |
| `NotFoundError` | 404 | recurso inexistente |
| `ConflictError` | 409 | estado duplicado/conflitante |

Use-case/domínio **nunca** lança erro interno/500. Códigos ficam em `Errors` (constantes no `shared`);
body de erro `{ statusCode, errors: [{ code }] }`. Códigos previstos (ampliar conforme necessário):
`INSUFFICIENT_BALANCE`, `INVALID_AMOUNT`, `INVALID_STAKE`, `BETTING_CLOSED`, `MATCH_NOT_OPEN`,
`MATCH_ALREADY_SETTLED`, `NOT_A_PARTICIPANT`, `MATCH_NOT_FOUND`, `BET_NOT_FOUND`, `WITHDRAWAL_TOO_LARGE`,
`PAYMENT_NOT_FOUND`, `NOT_ADMIN`, `SCHEDULED_IN_PAST`, `CATEGORY_NOT_FOUND`, `CATEGORY_NOT_LEAF`,
`CATEGORY_HAS_CHILDREN`, `CATEGORY_ALREADY_EXISTS`.

## Contextos

- **auth** — identidade/credencial. `User` (com `role`: `user`/`admin`), `AuthSession`. JWT access 15m +
  refresh 7d **stateful** (rotação + detecção de reuso). VOs: `Email`, `StrongPassword`, `PasswordHash`.
- **wallet** — `Wallet` (`balance`/`held`; `available = balance − held`) + `LedgerEntry` (append-only) +
  `Payment` (depósito/saque). Porta `PaymentGateway` (adapter manual/admin-confirmado). Endpoints admin
  para confirmar depósito e efetivar saque.
- **match** — `Match` (2+ participantes; `scheduledAt` obrigatório e no futuro na criação; `imageUrl`
  opcional; status
  `open → locked → settled` / `cancelled`), `MatchParticipant`. Métodos: `lockBetting()`,
  `settle(winnerParticipantId)`, `cancel()` (invariantes de transição no modelo). **Criar partida é
  admin-only** (`CreateMatch` estende `AdminUseCase`). **Editar** (`UpdateMatch`, admin) muda
  título/tipo/data **só enquanto `open`** (`Match.edit`); participantes e imagem não são editáveis
  após criar. Mudar a data reagenda o auto-lock. O **auto-lock** trava as apostas sozinho quando
  chega o `scheduledAt`: `CreateMatch` agenda via porta `MatchLockQueue` (job BullMQ **atrasado**) e o
  worker roda `AutoLockMatch` (system, não-admin, idempotente).
- **betting** — `Bet` (`open/won/lost/refunded`), `PayoutCalculator` (parimutuel), `SettleMatch`
  (enfileirado → worker), stats.
- **category** — árvore auto-referente de categorias (`Category` com `parentId` opcional; ex.:
  games → e-sports → Counter Strike). CRUD **admin-only** (`Create/Update/Delete` estendem
  `AdminUseCase`); listar é aberto (usado no cadastro da match). `isLeaf` é do read model. Delete só
  em nó sem filhos (`CATEGORY_HAS_CHILDREN`); dedup de nome por pai (`CATEGORY_ALREADY_EXISTS`). A
  match aponta pra uma **folha**.

## Rotas HTTP

- **Nomes de rota em INGLÊS** (kebab-case). Ex.: `auth/{register,login,refresh}`,
  `user/{me,change-password,logout,deactivate}`, `wallet/{me,deposit,withdraw}`, `match` (`/`, `/:id`
  [GET e PATCH], `/:id/lock`, `/:id/settle`, `/:id/cancel`), `upload/matchs`, `bet` (`/`, `/:id`),
  `category` (`/` [GET aberto; POST admin], `/:id` [PATCH e DELETE admin]), `admin/{deposits,withdrawals}`.
- **Anti-IDOR na borda**: o `AuthMiddleware` (aplicado **por classe** de controller via
  `forRoutes(XController)`) valida o token e resolve o id autenticado; controllers usam **sempre** esse
  id (via `@authenticatedUser`), nunca id vindo do corpo/rota. Rotas admin passam por um guard de role.

## Convenções de código

- **TODA pasta e TODO arquivo em kebab-case** — inclusive componentes React e hooks (`login.tsx`,
  `use-protect-route.ts`), nunca `Login.tsx`/`useProtectRoute.ts`. O **identificador** dentro do arquivo
  mantém sua convenção (classe/tipo em PascalCase, hook em camelCase). Nest mantém `.controller.ts`/
  `.module.ts`/`.middleware.ts`.
- **Nomes em INGLÊS** em tudo. **Nunca** variável de uma letra.
- **`isolatedModules` ligado** → re-export de tipo usa `export type { ... }`.
- Colunas do banco em snake_case via `@map` (campo Prisma continua camelCase). DTOs de leitura **nunca**
  expõem segredos.

## Auth e segurança

- **JWT**: access 15m + refresh 7d **stateful** (tabela `AuthSession`, uma por login/dispositivo):
  rotação a cada refresh + detecção de reuso (refresh autêntico mas não-atual → apaga a família).
- **Front é SPA**: `login` devolve `accessToken` no corpo e grava `refreshToken` em cookie `httpOnly`
  (`secure` só em produção); `auth/refresh` lê o cookie e rotaciona.
- **CORS com credenciais**: origin específica (`WEB_ORIGIN`) + `credentials: true`.
- **Role admin** = o dono. Guard de role protege rotas de confirmação de depósito/saque e de settlement.

## Banco de dados

- Prisma em **`packages/database`**: `prisma/schema.prisma` + client gerado em `generated/` (gitignored).
  Backend e worker fazem `import { PrismaClient } from 'database'`. Repos Prisma são adapters em cada app.
- **Models/tabelas previstas**: `User`(users), `AuthSession`(auth_sessions), `Wallet`(wallets),
  `LedgerEntry`(ledger_entries), `Payment`(payments), `Match`(matches), `MatchParticipant`(match_participants),
  `Bet`(bets), `Category`(categories, self-relation `parent_id`). FKs entre contextos são **lógicas**
  (sem relation Prisma cruzando contexto — ex.: `matches.category_id`); a self-relation da `Category` é
  intra-contexto, então tem relation Prisma. Dinheiro em `Int` (centavos). Colunas snake_case via `@map`.
- **Greenfield**: schema do zero; cada contexto adiciona seu(s) `model`. `npm run db:sync` = `prisma db push`.

## Worker e fila (settlement assíncrono)

- `SettleMatch` (disparado pelo admin ao declarar o resultado) **enfileira** via porta `MatchSettlementQueue`
  (produtor BullMQ no backend). O **worker** consome a fila `match-settlement` e roda o settlement através da
  facade do `betting`, aplicando o `PayoutCalculator` e persistindo tudo numa transação.
- Os literais da fila precisam bater entre backend (produtor) e worker (consumidor). O worker **não** usa
  Groq/Playwright.
- Além do settlement, o worker consome a fila `match-lock`: `CreateMatch` agenda um job **atrasado**
  (delay = `scheduledAt − agora`) via porta `MatchLockQueue`; quando dispara, o worker roda
  `MatchFacade.autoLockMatch` (`AutoLockMatch`), travando as apostas no horário da partida.

## Uploads (armazenamento local, sem nuvem)

- Arquivos ficam em **`apps/backend/uploads/<tema>/`** (ex.: `uploads/matchs`), servidos estáticos em
  **`/uploads/**`** via `app.useStaticAssets` (o `main.ts` cria as subpastas no boot). A pasta é gitignored.
- Upload é **admin-only**: `UploadController` (`POST /upload/matchs`, `AuthMiddleware` + `AdminGuard`,
  `FileInterceptor` do multer com `diskStorage`, só `image/*`, limite de 5 MB) salva o arquivo com nome
  `uuid.ext` e devolve `{ url: '/uploads/matchs/<arquivo>' }`. A entidade guarda esse caminho relativo
  (`Match.imageUrl`); o front monta a URL absoluta com `lib/media.ts` (`mediaUrl`). Novo tema = nova
  subpasta em `UPLOADS_SUBDIRS` + rota no controller.

## apps/web (Next.js SPA)

**Stack travada**: Next.js (App Router) + **Tailwind** + **TanStack Query** + **Axios** + **react-hook-form**.
**SEM zod** no front (validação de negócio já está no domínio; no front só validação de UI simples).

- **Visual ≠ lógica**: em `app/`, cada rota tem `<rota>/components/` (só JSX) e `<rota>/hooks/` (states,
  effects, handlers, chamadas). `page.tsx` só importa e renderiza.
- **Route groups por acesso**: `app/(public)/` (login/register) e `app/(private)/` (dashboard, match, wallet,
  bet). Guard no `layout.tsx` do grupo, nunca por página.
- **Reusar os tipos dos `@ctx/adapters`** via `import type` (request e resposta). Não redeclarar contratos.
- **Auth do SPA**: `accessToken` em memória (nunca localStorage); refresh no cookie httpOnly; axios com
  `withCredentials`; interceptor de 401 chama `/auth/refresh` (dedup) e repete; silent refresh no boot.

## Testes

- Têm testes: **`core`**, **`shared`** e **`apps/worker`**. Com modelagem rica, os testes cobrem
  **invariantes de VOs/entidades** (ex.: `Money` rejeita negativo, `Wallet.hold` além do disponível lança
  `INSUFFICIENT_BALANCE`, `PayoutCalculator` divide o pool certo) além dos use-cases.
- Use-cases testados com **fakes das portas em memória** em `test/in-memory/` (cada fake `export default`;
  `index.ts` reexporta com nome; ex. `InMemoryWalletRepository`). Testes importam de `'../src'`.
- Jest + ts-jest; `moduleNameMapper` resolve `shared`/`@ctx/core` pro source.

## Dev e verificação

- `npm run dev` = `db:up` (Postgres + Redis no docker) → `db:sync` (prisma db push) → `turbo run dev`.
- **Antes de declarar pronto** (não bootar servidor — precisa de Postgres/Redis):
  ```bash
  npx turbo run check-types test build
  ```
  Tudo verde = ok.

## Commits

`tipo(escopo): assunto`, escopo = caminho do pacote/app (ex.: `feat(packages/wallet/core)`), mensagem em
português, corpo enxuto, **um commit por escopo**, **sem rodapé de co-autoria**.
