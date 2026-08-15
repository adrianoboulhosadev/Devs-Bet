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

Contextos de domínio: `auth`, `wallet`, `match`, `betting`, `category`, `participant`, `tournament`,
`notification`. O `auth` é a **referência canônica**
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
  worker/    # consumidor BullMQ que roda o SettleMarket (paga/estorna as apostas). Tem testes. NÃO usa Groq/Playwright.
  web/       # Next.js (App Router) + Tailwind + TanStack Query + Axios + react-hook-form.
  database/  (container-db)            # docker-compose: Postgres + Redis (dev)
```

Contextos e scopes: `@auth/*`, `@wallet/*`, `@match/*`, `@betting/*`, `@category/*`, `@participant/*`,
`@tournament/*`, `@notification/*`. `core` e
`adapters` são **pacotes separados**. Workspaces: `["apps/*","packages/shared","packages/database","packages/*/core","packages/*/adapters"]`.

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
  controller/facade do adapters (ex.: o worker chama `BettingFacade.settleMarket`, nunca `new SettleMarket`).
- **`core` só depende de `shared`** (e `uuid`, via shared). **Proibido**: Zod ou qualquer outra lib
  no core. Validação usa `Validator`/`ValidationError`/`Errors` do `shared`.
- **Adapters**: `controllers/` são presenters finos (instanciam o use-case e devolvem só o que o
  front precisa); `facade/` é a entrada única que o app chama (ports **opcionais** no construtor).
- **Controllers do backend (Nest)** montam a Facade num helper `private facade()` que injeta os
  driven adapters uma vez; cada rota chama `this.facade().xxx(...)`.
- **Domain services**: regras puras que cruzam entidades (ex.: `PayoutCalculator` do parimutuel,
  agregações de stats) → classe em `core/src/domain-services/` com métodos **estáticos**, sem portas
  e sem efeito. Reexportada como **valor** pelo `@ctx/adapters`.
- **Eventos de domínio (TRAVADO)**: o que aconteceu no domínio é registrado como um **fato no
  passado** pela própria entidade, no exato ponto da transição. Base no `shared`: `DomainEvent`
  (só `occurredAt`), `AggregateRoot<T, Props> extends Entity` (com `protected record(event)` e
  `pullDomainEvents()`) e a porta `EventPublisher { publish(events) }`. Quem tem evento
  **estende `AggregateRoot`** em vez de `Entity` (hoje: `User`, `Payment`, `Bet`, `ComboBet`); as
  classes de evento ficam em `core/src/model/events.ts` de cada contexto e são reexportadas como
  **valor** pelo `@ctx/adapters` (o listener precisa da classe pra `instanceof`, não do tipo).
  - **`pullDomainEvents()` DRENA a lista** (a segunda chamada vem vazia) e a lista **nunca é
    `props`** — então reconstituir uma linha do banco nasce sem evento; só transição feita na
    execução atual gera fato.
  - **Quem publica é o CASO DE USO**, com `eventPublisher?: EventPublisher` opcional no construtor
    (mesmo molde do `MatchLockQueue` no `CreateMatch`), chamado **depois** do `repository.xxx(...)`.
    Roteado pelos controllers finos até a facade, como toda porta.
  - **Evento de CRIAÇÃO é montado no caso de uso, não pela entidade** (`UserRegistered`,
    `DepositRequested`, `WithdrawalRequested`): o construtor serve tanto pra criar quanto pra
    RECONSTITUIR do banco, então ele nunca pode registrar nada.
  - **Registrar ≠ publicar**: `Bet.refund()` registra `BetRefunded` sempre, mas o `CancelBet` (o
    apostador desistindo da própria aposta) **não recebe a porta** — o fato existe e ninguém o
    publica. É assim que "cancelamento não vira notificação" fica garantido pelo tipo, sem `if`.
  - **`User.reject()` não registra nada** — a decisão de produto ("ser barrado tem que parecer senha
    errada") mora no modelo, então nenhum caminho consegue vazá-la por engano.
  - **Onde os eventos são consumidos muda por caminho, e é decisão consciente**: no backend o
    `DomainEventListener` (implementa `EventPublisher`) traduz evento → notificação **depois** do
    commit; no **worker** o adapter de settlement puxa `bet.pullDomainEvents()` **dentro da
    transação**, porque a notificação é derivada das mesmas linhas sendo escritas (ver a seção do
    contexto `notification`).
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
  `category`=árvore de categorias das partidas; `tournament`=chaveamento eliminatório que orquestra matches;
  `notification`=caixa de entrada do usuário (não conhece nenhum outro contexto — quem dispara é a camada de app).
- **Categoria da partida (cross-context)**: o `match` guarda `categoryId` (folha da árvore) como
  dado puro; a validação "existe + é folha" segue o padrão do `PlaceBet` — o **backend resolve** via
  `category` (`findByIdQuery` → `isLeaf`) e passa `categoryIsLeaf` pro use-case do match (que lança
  `CATEGORY_NOT_LEAF`). O match **não** importa o `category`.

## Dinheiro, transações e atomicidade

- **Dinheiro em centavos** (`Int`), nunca float. O VO `Money` (no `shared`) encapsula centavos + BRL
  e as operações (`add`/`subtract`/`isNegative`/`isGreaterThan`); colunas Prisma em `Int`.
- **Operações de dinheiro são atômicas.** Apostar = `wallet.hold(stake)` + criar `Bet` + registrar no
  ledger num **único commit**; settlement = pagar N apostas + creditar/consumir N carteiras de uma vez.
  A **porta expõe a operação composta** (ex.: `BettingRepository.placeBet(...)`, `settleMarket(...)`) e o
  **adapter Prisma envolve em `$transaction`**. O core não conhece Prisma; a atomicidade é do adapter.
- **Ledger append-only**: toda mudança de saldo gera um `LedgerEntry` (deposit, bet_hold, bet_won,
  bet_lost, refund, withdrawal). Fonte de auditoria — nunca editar/apagar linha de ledger.

## Payout parimutuel

Domain service `PayoutCalculator.calculate(bets, winningSelectionId, rakeBasisPoints)` (puro/estático).
Mesma matemática pra **qualquer mercado** (vencedor de uma match ou campeão de um torneio), agrupando pela
**seleção** da aposta:

- `pool(selection)` = soma dos stakes naquela seleção; `total` = soma de todos.
- `distributable = total − rake` (`rake = total × rakeBasisPoints / 10000`; começa em 0).
- Aposta vencedora `i` recebe `stake_i / pool(winner) × distributable`. Odd implícita do vencedor =
  `distributable / pool(winner)` → quanto menor o pool, maior o pagamento (azarão paga mais).
- `pool(winner) == 0` (declarado um vencedor, mas ninguém apostou nele) → **estorna todos**: sem bilhete
  vencedor não há o que ratear, e consumir as apostas tiraria dinheiro que ninguém ganhou (é o que o
  parimutuel clássico faz). Mercado/partida **cancelado** também estorna, por outro caminho
  (`RefundMarket`, separado do `SettleMarket`).
- Se **todos** apostaram na MESMA seleção e ela vence, cada um recebe exatamente o que apostou — estão
  rateando o próprio dinheiro (`stake / total × total`). Sem lucro, sem prejuízo.
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
`PAYMENT_NOT_FOUND`, `RECEIPT_REQUIRED`, `NOT_ADMIN`, `SCHEDULED_IN_PAST`, `DRAW_NOT_ALLOWED`, `INVALID_BEST_OF`,
`INVALID_UNIT_NUMBER`, `CATEGORY_NOT_FOUND`, `CATEGORY_NOT_LEAF`,
`CATEGORY_HAS_CHILDREN`, `CATEGORY_ALREADY_EXISTS`, `TOURNAMENT_NOT_FOUND`, `INVALID_TOURNAMENT_SIZE`,
`NOT_ENOUGH_TOURNAMENT_PARTICIPANTS`, `DUPLICATE_PARTICIPANT_NAME`, `TOURNAMENT_NOT_OPEN`,
`TOURNAMENT_ALREADY_FINISHED`, `BRACKET_SLOT_NOT_FOUND`, `INVALID_COMBO_LEGS`, `DUPLICATE_COMBO_MARKET`,
`INVALID_COMBO_ODD`, `DEPOSIT_LIMIT_EXCEEDED`, `SELF_EXCLUDED`, `ALREADY_SELF_EXCLUDED`,
`STAKE_LIMIT_EXCEEDED`, `NOTIFICATION_NOT_FOUND`.

## Contextos

- **auth** — identidade/credencial. `User` (com `role`: `user`/`admin`), `AuthSession`. JWT access 15m +
  refresh 7d **stateful** (rotação + detecção de reuso). VOs: `Email`, `StrongPassword`, `PasswordHash`.
  `User` também guarda `nickname`/`avatarUrl` (ambos `string | null`, sem VO — mesmo padrão solto do
  `Participant.nickname`/`imageUrl`): **display-only**, nunca usados pra autenticar (login continua por
  e-mail). Editáveis via `PATCH /user/me` (`UpdateProfile`, use-case simples que carrega o `User` e
  chama `user.editProfile(...)`); o avatar é upload self-service (`POST /upload/avatars`, mesmo padrão do
  de comprovante — só `image/*`, 5 MB) que devolve a URL pro front então gravar com o PATCH.
  **Plataforma fechada — aprovação de cadastro (portaria)**: o produto fica exposto na internet mas é
  só pros amigos do dono, então o auto-cadastro continua aberto e quem barra estranho é um **admin**.
  `User.approvalStatus` (`pending`/`approved`/`rejected`, campo solto igual `nickname`, com
  `isApproved`/`approve()`/`reject()` na entidade) nasce **`pending`** — vale pro cadastro por
  formulário E pro primeiro login via Google (o `LoginWithGoogle` cria o `User` sem passar o campo, então
  cai no default; a conta e o vínculo `OAuthAccount` são criados normalmente, só o acesso é barrado).
  O que cada estado responde no login (`LoginUser` e `LoginWithGoogle`, mesma ordem nos dois):
  `rejected` → `UnauthorizedError`/`INVALID_EMAIL_OR_PASSWORD` (401) — **de propósito idêntico a senha
  errada**, pra quem foi barrado não descobrir nem que a conta existe; `pending` →
  `AccessDeniedError`/`ACCOUNT_PENDING_APPROVAL` (403, explícito — é um amigo legítimo na fila, e ele
  precisa saber por que não entra). O 403 também evita o interceptor de 401 do axios, que tentaria um
  refresh inútil. `RefreshToken` exige `isApproved` (senão `INVALID_SESSION`) e o **`AuthMiddleware`
  relê o estado a cada request** — é isso que faz revogar acesso valer na hora, em vez de esperar o
  access token de 15m expirar. Admin decide por `SetUserApproval` (`AdminUseCase`): recusa alterar o
  **próprio** status (`NOT_ADMIN` — auto-revogação travaria a plataforma sem ninguém pra reabrir) e,
  ao rejeitar, chama `AuthSessionRepository.deleteAllByUser` pra derrubar as sessões abertas —
  **rejeitar é também o "revogar acesso"** de quem já estava dentro. `ListUsersQuery` (admin) lista
  todo mundo pra tela `/admin`; é a **única** tela que mostra e-mail de terceiros, e é deliberado: sem
  o e-mail o admin não reconhece o amigo pra liberar. **Coluna `approval_status` tem default
  `"approved"` no Prisma** — herança da era do `db push` (sem migration), em que um default `pending`
  marcaria todas as contas já existentes como pendentes, trancando o dono pra fora; o default
  da *entidade* é que garante `pending` pra conta nova, e o repositório sempre grava o valor explícito.
  Hoje o projeto usa migration (ver a seção Banco de dados), então um caso desses se resolve com
  backfill explícito no SQL da migration — mas o default da coluna ficou como está, porque mudá-lo
  agora não altera nada em runtime e só arriscaria contas existentes à toa.
  ⚠️ Num banco **zerado** o primeiro usuário nasce pendente sem ninguém pra aprovar — desbloquear por
  SQL, mesmo processo que já se usa pra promover alguém a admin.
- **wallet** — `Wallet` (`balance`/`held`; `available = balance − held`) + `LedgerEntry` (append-only) +
  `Payment` (depósito/saque). Porta `PaymentGateway` (adapter manual/admin-confirmado). Endpoints admin
  para confirmar depósito e efetivar saque. **Depósito é um wizard de 2 passos no front**: (1) o usuário
  digita o valor; (2) mostra o Pix pra pagar (QR code real — BR Code/EMV gerado no front,
  `apps/web/src/lib/pix.ts`, com CRC16 — a partir de `DepositInstructions`, que ganhou
  `beneficiaryCity`; sem txid dinâmico, campo `62/05` fixo em `***`) **+ input de arquivo pro
  comprovante (imagem ou PDF), obrigatório**. O comprovante é enviado primeiro
  (`POST /upload/receipts`, rota **não-admin** — o próprio usuário autenticado envia o seu; ver seção
  Uploads) e só então o depósito é de fato criado (`POST /wallet/deposit` com `receiptUrl`) — não existe
  `Payment` de depósito sem comprovante: a própria entidade `Payment` rejeita (`RECEIPT_REQUIRED`) um
  `direction: 'deposit'` sem `receiptUrl` no construtor (saque nunca tem comprovante). `receiptUrl` fica
  em `payments.receipt_url` (nullable) e aparece no `PaymentDTO`; o admin vê um link "Ver comprovante"
  (`mediaUrl`) no painel de pendências antes de confirmar o depósito.
  **Jogo responsável — limite de depósito**: `DepositLimit` (entidade rica, uma linha por usuário+período
  `daily`/`weekly`/`monthly`, `@@unique([userId, period])`) é um teto **autoimposto** pelo próprio usuário
  (self-service, não é o admin quem define). Janelas **rolantes** (últimas 24h/7d/30d — não alinhadas a
  calendário, evita o efeito "zera à meia-noite" e fuso horário) — `PERIOD_WINDOW_MS` no model.
  `DepositLimit.update(newAmount)` é a regra central: **diminuir aplica na hora**; **aumentar só entra em
  vigor 24h depois** (`pendingAmount`/`effectiveAt`) — evita o usuário subir o próprio limite às pressas
  antes de um depósito por impulso; um novo `update` que diminui de novo **cancela** o aumento agendado.
  `effectiveAmount()`/`ensureWithinLimit(usedInWindow, depositAmount)` resolvem um aumento vencido antes de
  comparar (auto-consistente, sem precisar de job externo). `RequestDeposit` carrega os limites do usuário
  (`WalletRepository.findDepositLimits`) e, pra cada um, soma o já depositado na janela
  (`sumDepositsSince`, conta `status !== 'rejected'`, ou seja pendente+confirmado) antes de criar o
  `Payment` — estoura o teto → `ValidationError`/`DEPOSIT_LIMIT_EXCEEDED` (mesma classificação de
  `INSUFFICIENT_BALANCE`). Rotas self-service: `GET`/`POST /wallet/deposit-limits` (`SetDepositLimit`
  cria ou ajusta; `ListMyDepositLimitsQuery` lista os próprios). **Simplificação desta v1**: não há como
  remover um limite já definido (só ajustar o valor) — cobre o pedido do usuário (limite de
  depósito diário/semanal/mensal) sem o caso extra de "tirar o teto de vez".
  **Jogo responsável — autoexclusão**: `SelfExclusion` (entidade rica, **append-only** — sem
  método de cancelar/editar; o usuário busca sempre a linha mais recente) bloqueia depósito **e**
  aposta por um período (`24h`/`7d`/`30d`/`permanent` — `until: null` é permanente). **Decisão de
  produto travada**: uma vez iniciada, **não dá pra cancelar antes do prazo** (nem a permanente) —
  é o ponto central da proteção contra impulsividade; só pode **começar uma nova** se não houver
  nenhuma ativa no momento (`ConflictError`/`ALREADY_SELF_EXCLUDED` senão). `RequestDeposit` checa
  a autoexclusão **antes** dos limites de depósito (`SELF_EXCLUDED`, mesma classificação de
  `DEPOSIT_LIMIT_EXCEEDED`). Rotas self-service: `GET`/`POST /wallet/self-exclusion`
  (`StartSelfExclusion`/`GetMySelfExclusionQuery`). O front (`useSelfExclusion`, hook global em
  `apps/web/src/hooks`) é consultado por qualquer tela que deposita ou aposta (carteira, partida,
  torneio, combo) só pra **desabilitar a UI** — quem garante a regra de verdade é sempre o backend.
- **match** — `Match` (2+ participantes; `scheduledAt` obrigatório e no futuro na criação; `imageUrl`
  opcional; status
  `open → locked → settled` / `cancelled`), `MatchParticipant`. Participantes são **escolhidos do catálogo**
  (`participant`, ver seção própria) — `MatchParticipant` carrega `participantId` (FK lógica, obrigatória)
  + `displayName`/`nickname`/`imageUrl` **snapshotados** na criação (o backend resolve o catálogo por id e
  passa os dados já prontos pro use-case; `match` nunca importa `@participant/core`). Duplicar o mesmo
  `participantId` na mesma match é rejeitado (`DUPLICATE_PARTICIPANT_NAME`). **`bestOf`** (1, 3 ou 5 — `VALID_BEST_OF`;
  defaults a 1) decide a match por maioria de **`MatchUnit`** (unidade sport-agnostic: mapa/leg/round/luta
  — não é "game" porque nem toda categoria é um jogo, ex.: luta de boxe). Métodos: `lockBetting()`,
  `recordUnitResult(unitNumber, winnerParticipantId)`, `cancel()` (invariantes de transição no modelo).
  `recordUnitResult` registra o vencedor da **próxima** unidade (sempre `units.length + 1` — quem chama
  nunca rastreia o número); quando alguém atinge a maioria (`ceil(bestOf/2)`), a match **se auto-liquida**
  (`settled` + `winnerParticipantId`). `winnerParticipantId: null` declara **empate** de uma unidade — só
  permitido quando `bestOf === 1` **e** o `Match` foi criado com **`allowsDraw: true`** (padrão da criação
  avulsa; joga `DRAW_NOT_ALLOWED` senão — um `bestOf` múltiplo nunca empata, sempre há maioria). Confronto
  de torneio é sempre criado com `allowsDraw: false` (`RecordBracketResultInput` também exige um vencedor
  real — dupla trava, domínio + tipo), mas herda o `bestOf` da rodada (`Tournament.bestOfByRound`) em que
  o confronto está. **Empate é uma seleção de aposta
  como qualquer outra**: quando `allowsDraw`, `MATCH_DRAW_SELECTION_ID` (`'draw'`, exportado por
  `@match/core`/`@match/adapters`) entra nas `selectionIds` válidas do mercado (o backend, em
  `bet.controller`, só soma esse id se `match.allowsDraw`) — tem pool/odd própria e pode ser
  apostado como A ou B. Ao liquidar um empate, o backend enfileira `winningSelectionId:
  MATCH_DRAW_SELECTION_ID` (traduzindo o `winnerParticipantId: null` da entidade); o
  `PayoutCalculator` trata como qualquer seleção vencedora — se ninguém apostou no empate, todo
  mundo perde (ver seção "Payout parimutuel"), não há estorno. **Criar partida é
  admin-only** (`CreateMatch` estende `AdminUseCase`). **Editar** (`UpdateMatch`, admin) muda
  título/tipo/data **só enquanto `open`** (`Match.edit`); participantes, imagem e `bestOf` não são
  editáveis após criar. Mudar a data reagenda o auto-lock. O **auto-lock** trava as apostas sozinho quando
  chega o `scheduledAt`: `CreateMatch` agenda via porta `MatchLockQueue` (job BullMQ **atrasado**) e o
  worker roda `AutoLockMatch` (system, não-admin, idempotente). A liquidação das apostas (settlement) só é
  enfileirada quando a match realmente chega em `settled` — enquanto o bestOf está em andamento
  (`locked`, aguardando a próxima unidade), nada é enfileirado.
- **betting** — aposta num **mercado**: `Bet` (`open/won/lost/refunded`) tem `marketType`
  (`match` | `tournament_outright`) + `marketId` (id da match ou do torneio) + `selectionId` (participante
  da match ou do torneio). `PayoutCalculator`/`OddsCalculator` (parimutuel) agrupam por `selectionId` — mesma
  lógica pros dois mercados. `SettleMarket`/`RefundMarket` (enfileirados → worker via fila `settlement`), stats.
  **Outright (campeão do torneio)**: aberto **só até o torneio começar** (trava no `scheduledAt`); liquida
  quando o campeão é decidido (paga bem mais — azarão), estorna se o torneio é cancelado. Quem resolve se o
  mercado está aberto + as seleções válidas é o **backend** (dado puro pro use-case), como no resto.
  **Odds ao vivo com histórico**: `OddsSnapshot` (append-only, sem regra de domínio — é só um efeito
  colateral de leitura) é gravado **dentro da própria transação do `PlaceBet`** (adapter, `PrismaBettingPlacementRepository`):
  depois de inserir a aposta, relê todas as apostas abertas do mercado e roda o mesmo `OddsCalculator`
  já existente, gravando uma linha por seleção com pool > 0 (`marketId`, `selectionId`, `pool`, `totalPool`,
  `impliedOdd`, `recordedAt`). **Pernas de combo nunca geram snapshot** — não tocam esse pool (mesma razão
  de sempre). Read-side: `BetQueryRepository.listOddsHistoryByMarket` + `GetOddsHistoryQuery`; rotas
  `GET /bet/match/:id/odds/history` e `GET /bet/tournament/:id/odds/history`. Front
  (`components/odds-history-chart/`, reaproveitado por partida e outright): gráfico **em degrau** (odd só
  muda quando alguém aposta, então a linha fica reta entre pontos e "pula" a cada evento) via SVG puro (sem
  lib nova), paleta categórica de 8 cores neon (as mesmas do tema retrô-arcade — validada com o script da
  skill de dataviz contra o fundo escuro do card: CVD/contraste/chroma passam, só o check de "faixa de
  luminosidade" falha, porque neon-sobre-preto é o visual pedido, não uma falha de acessibilidade), com
  legenda, crosshair+tooltip no hover e alternância pra tabela (acessibilidade). **Cap de 8
  séries**: mercados com mais seleções que isso (ex.: outright de torneio de 32) mostram só as **mais
  apostadas** (maior pool), com aviso de quantas ficaram de fora — 32 linhas coloridas seria ilegível.
  **Ranking de apostadores**: domain service `LeaderboardCalculator.calculate(bets, limit)` (puro/estático,
  mesmo padrão do `OddsCalculator`) agrupa **todas** as apostas `won`/`lost` (de qualquer mercado) por
  `bettorId` e soma `netProfit = totalPayout − totalStaked`; apostas `open`/`refunded` são ignoradas (refund
  é neutro, não carrega sinal de habilidade). Ordena por `netProfit` desc (empate: `betsWon` desc, depois
  `totalStaked` desc, depois `bettorId` p/ ordem estável) e corta em `limit`. Porta nova
  `BetQueryRepository.findSettledBets()` traz as entidades `Bet` com `status !== 'open'` de qualquer mercado
  (o adapter Prisma faz um único `findMany`, sem agrupar por tipo). `GetLeaderboardQuery` (read-only) chama
  a porta + o domain service e devolve `LeaderboardEntryDTO[]`. Rota aberta a **qualquer usuário autenticado**
  (não é admin-only, é vitrine pública do produto) — `GET /bet/leaderboard?limit=N` (default 10). O front
  (`app/(private)/leaderboard`) mostra o id do apostador **truncado** (8 chars, igual ao painel admin de
  pagamentos) — nunca o e-mail, pra não expor dado pessoal numa tela que qualquer usuário vê.
  **Nível/XP do apostador**: domain service `LevelCalculator` (`core/src/domain-services`, puro/estático,
  mesmo molde do `LeaderboardCalculator`/`OddsCalculator`) dá XP só em apostas **vencidas** (`lost`/`open`/
  `refunded` não contam — mesmo critério do leaderboard): `xpForWin(legs) = round(10 × legs^1.3)` — uma
  simples é `legs=1` (10 XP); uma múltipla de N pernas usa `legs = ComboBet.legs.length` (2 pernas = 25 XP,
  3 = 42 XP, 4 = 61 XP) — cresce **mais que linear** porque a odd de uma múltipla já multiplica o risco por
  perna, então o XP acompanha. Nível sobe numa curva progressiva, não fixa: XP acumulado pra **chegar** no
  nível N é `100 × (N−1) × N / 2` (nível 1 = 0 XP, nível 2 = 100, nível 3 = 300, nível 4 = 600, ...) — cada
  nível pede mais XP que o anterior. `LevelCalculator.calculate(simpleBets, combos)` devolve
  `ProfileStatsDTO { wins, losses, xp, level, xpIntoLevel, xpToNextLevel }`; roda **ao vivo** a cada leitura
  (nenhuma settled bet é apagada, então não precisa persistir XP em lugar nenhum — igual o leaderboard).
  Porta nova `BetQueryRepository.findSettledBetsByBettor(bettorId)` (versão de `findSettledBets()` filtrada
  por um bettor) + a já existente `listComboBetsByBettorQuery`. `GetMyProfileStatsQuery` (betting, read-only)
  chama as duas portas e o domain service. A rota composta `GET /user/me/profile` (em `apps/backend/src/user`,
  não em `apps/backend/src/betting`) monta o DTO final cruzando **auth** (id/e-mail/nickname/avatarUrl/
  createdAt, já vem pronto do `@authenticatedUser()` — é um `UserDTO` fresco, ver seção auth) com **betting**
  (`BettingFacade.getMyProfileStats`) — mesma orquestração cross-context na camada de app que o `PlaceBet`
  já faz, só que de leitura. O shape composto (`ProfileDTO`) não pertence a nenhum `@ctx/adapters` — é
  local ao controller, e o front espelha o tipo à mão (não tem de onde importar). O bloco de usuário do
  front (sidebar + página de perfil) consome essa rota pra mostrar "nível N" e a barra de XP.
  **Bilhete múltiplo (combo/parlay) — odds FIXAS**: `ComboBet` + `ComboLeg` (entidades ricas, `core/src/model`)
  são um mecanismo **paralelo** ao parimutuel de cima — pedido explícito do usuário de reproduzir "o mesmo
  cálculo que as casas de apostas usam" (multiplicar odds), o que é **incompatível** com o parimutuel (cujo
  payout só existe no pool final). Por isso as pernas do combo **nunca entram nos pools** das apostas simples;
  é uma aposta paralela, precificada pela odd indicativa do momento (mesmo `OddsCalculator` que já existe) e
  **travada** (fixa) a partir daí. `ComboLeg.odd` é a odd travada na perna; `ComboBet.totalOdd` é o produto de
  todas; `payout = stake × totalOdd` só se **todas** as pernas vencerem. Mínimo **2 pernas** (`INVALID_COMBO_LEGS`),
  **sem mercado repetido** no mesmo bilhete (`DUPLICATE_COMBO_MARKET`), odd mínima 1.01 (`INVALID_COMBO_ODD`).
  `ComboBet.resolveLeg(marketId, 'won'|'lost'|'void')` (chamado pelo settlement de cada mercado) reavalia o
  bilhete: **uma perna perdida encerra o bilhete inteiro na hora** (`lost`, payout 0), mesmo com outras pernas
  pendentes — igual a uma casa de apostas de verdade; quando todas as pernas resolvem, uma perna **anulada**
  (mercado cancelado) **estorna o bilhete inteiro** (simplificação: não remove a perna nem recalcula a odd,
  diferente de algumas casas reais); senão (todas venceram) paga `stake × totalOdd`. Idempotente (no-op se o
  bilhete já liquidou). `SettleMarket`/`RefundMarket` foram estendidos para, além das apostas simples do
  mercado, buscar (`BettingSettlementRepository.findComboBetsWithOpenLegByMarket`) e resolver qualquer perna
  de combo daquele `marketId`, persistindo via `applyComboSettlement` (mesma responsabilidade da porta de
  settlement, só que pro lado combo — aplica o efeito na carteira **só** quando o bilhete de fato muda de
  status nesta rodada; se ainda restam pernas pendentes, só grava o resultado da perna, sem mexer no saldo).
  **Simplificação aceita e avisada ao usuário**: como a odd é fixa (definida a partir do pool no momento da
  aposta) e o payout não vem de um pool compartilhado, a "casa" absorve o risco do preço — sem margem/vig
  embutida (só o cálculo de multiplicação foi pedido). Rotas: `POST /bet/combo` (cada perna chega do cliente
  só com `marketType`/`marketId`/`selectionId`; o backend resolve `marketOpen`/`selectionIds` — igual ao
  `PlaceBet` — e a odd via `getMarketOdds`, com fallback **2.00 (evens)** quando ninguém ainda apostou naquela
  seleção) e `GET /bet/combo/mine`. Front: `app/(private)/combo` monta o bilhete escolhendo partidas/torneios
  abertos + seleção, mostra uma odd combinada **estimada** (via as mesmas rotas de odds indicativas — o valor
  real só trava na confirmação) e lista o histórico de bilhetes do usuário.
  **Jogo responsável — limite de aposta diária**: `StakeLimit` (mesmo padrão rico do `DepositLimit` do
  wallet — diminuir aplica na hora, aumentar agenda com carência de 24h — mas **só janela diária**, sem
  período configurável). Porta `StakeLimitRepository` (`findStakeLimit`/`saveStakeLimit`/
  `sumStakedSince`) é **compartilhada** por `PlaceBet` e `PlaceComboBet` — aposta simples e bilhete
  múltiplo **disputam o mesmo orçamento diário** (`sumStakedSince` soma `bets` + `combo_bets` do
  apostador). Estourou → `ValidationError`/`STAKE_LIMIT_EXCEEDED`. Além do limite, os dois use-cases
  também recebem `bettorSelfExcluded` (bool resolvido pelo backend via `PrismaWalletRepository` —
  cross-context, igual ao padrão de `marketOpen`/`categoryIsLeaf`) e bloqueiam com `SELF_EXCLUDED` antes
  de qualquer outra checagem. Rotas self-service: `GET`/`POST /bet/stake-limit`. Front: seção na página
  `/bets`.
- **category** — árvore auto-referente de categorias (`Category` com `parentId` opcional; ex.:
  games → e-sports → Counter Strike). CRUD **admin-only** (`Create/Update/Delete` estendem
  `AdminUseCase`); listar é aberto (usado no cadastro da match). `isLeaf` é do read model. Delete só
  em nó sem filhos (`CATEGORY_HAS_CHILDREN`); dedup de nome por pai (`CATEGORY_ALREADY_EXISTS`). A
  match aponta pra uma **folha**.
- **participant** — catálogo reaproveitável de competidores: `Participant` (`name` obrigatório e
  **único no catálogo inteiro** — sem escopo por categoria, é uma lista global —, `nickname` e
  `imageUrl` opcionais). Resolve o pedido de não digitar o mesmo nome toda vez que cria uma
  match/torneio: o admin cadastra o participante **uma vez** (`/participants`) e, na hora de criar
  a match/torneio, só **escolhe** (`ParticipantPicker`, front) quem entra — **não existe mais campo
  de texto livre pro nome do jogador**. CRUD **admin-only** (`Create/Update/DeleteParticipant`
  estendem `AdminUseCase`); listar é aberto (alimenta o picker). **Editar é livre** (renomear/trocar
  apelido/foto a qualquer momento) — não reescreve o histórico, porque `MatchParticipant`/
  `TournamentParticipant` guardam sua própria **cópia** (`displayName`/`nickname`/`imageUrl`)
  tirada no instante da criação da match/torneio, não uma referência ao dado atual. **Excluir só se
  nunca foi usado** (`PARTICIPANT_IN_USE` senão) — quem resolve "já foi usado" é o **backend**
  (`ParticipantController` consulta `match_participants`/`tournament_participants` por
  `participantId`, cross-context, igual ao padrão de `categoryIsLeaf`), não o próprio contexto
  `participant` (que nunca importa `match`/`tournament`). Upload de foto: `/upload/participants`
  (admin-only, mesmo padrão de `/upload/matchs`). Rotas: `GET`/`POST /participant`, `PATCH`/`DELETE
  /participant/:id`.
- **notification** — caixa de entrada do usuário (sininho no header + tela `/notifications`). Resolve o
  problema de o usuário só descobrir o que aconteceu **indo procurar** (abrir `/bets` pra ver se
  liquidou, `/wallet` pra ver se o Pix entrou) e de o admin só ver a fila entrando na sala de controle.
  `Notification` (entidade rica: `userId` destinatário — FK lógica —, `type`, `title`, `body`, `link`,
  `referenceId`, `readAt`; `markAsRead()` idempotente, mantendo o timestamp original). **A cópia mora
  no domínio**: `Notification.for(input)` é um factory com `switch` sobre uma **união discriminada**
  (`NotificationInput`, um shape por tipo — `bet_won` pede `payout`, `deposit_confirmed` pede `amount`),
  então nenhum caller inventa campo nem esquece o valor, e o texto fica numa decisão só em vez de
  espalhado por três apps. O texto é gravado **já renderizado** — a notificação é o registro do que foi
  dito na época, então mudar a redação depois não reescreve o histórico. Tipos e quem dispara:
  | tipo | quem recebe | onde dispara |
  |---|---|---|
  | `bet_won`/`bet_lost`/`bet_refunded` | apostador | worker, na transação do settlement |
  | `combo_won`/`combo_lost`/`combo_refunded` | apostador | worker, idem (só quando o bilhete de fato liquida) |
  | `deposit_confirmed`/`deposit_rejected`/`withdrawal_paid`/`withdrawal_rejected` | apostador | `AdminWalletController` |
  | `account_approved` | apostador | `AdminUserController` (approve) |
  | `admin_signup_pending` | admins | `AuthController` (register) |
  | `admin_deposit_pending`/`admin_withdrawal_pending` | admins | `WalletController` |
  **Rejeitar cadastro NÃO notifica** — de propósito: ser barrado tem que parecer senha errada (ver a
  seção auth), e uma linha na caixa de entrada entregaria o jogo. **Idempotência** vem do banco:
  `@@unique([userId, type, referenceId])` + `createMany({ skipDuplicates: true })`, então job de
  settlement reprocessado ou duplo clique do admin não duplica; eventos sem referência
  (`referenceId: null`) podem repetir de propósito (cada pedido de depósito É um evento novo, e no
  Postgres dois NULL nunca colidem). **Quem são os admins** sai de `PrismaUserRepository.findAdminIds()`
  — método do **app**, fora da porta do `auth/core` (nenhum use-case de auth precisa disso), só admins
  ativos e aprovados. **Dados pessoais**: o `admin_signup_pending` carrega o e-mail (chega só a admin,
  mesma justificativa da tela de portaria — sem ele o dono não reconhece o amigo); as pendências de
  depósito/saque usam apelido ou **id truncado**, nunca e-mail. **Onde a escrita acontece muda por
  caminho, e é decisão consciente**: no backend o disparo é **depois** do commit e **engole o próprio
  erro** (`DomainEventListener` — traduzir o evento, gravar e pingar são a mesma responsabilidade e
  moram nele; não existe camada intermediária) — carteira creditada não pode ser desfeita porque a
  caixa de entrada falhou; no worker a notificação é gravada **dentro da transação do settlement** (mesmo precedente do
  `OddsSnapshot` dentro do `PlaceBet`), porque ali ela é derivada das mesmas linhas sendo escritas,
  então não pode se perder nem sobreviver a um rollback. **Quem dispara cada notificação são os
  EVENTOS DE DOMÍNIO** — ver a seção própria abaixo; nenhum controller monta `NotificationInput` na
  mão. Front: `useNotifications` (hook global, **sem polling** — a query só refaz a leitura quando
  alguém a invalida), `useNotificationStream` (o SSE que invalida), `NotificationBell` (badge, painel
  ancorado, fecha em Escape/clique fora) e `app/(private)/notifications`.
- **tournament** — chaveamento eliminatório (single-elimination) que **orquestra matches**. `Tournament`
  (status `in_progress → finished` / `cancelled`; `size` ∈ {2,4,8,16,32,64,128} — potência de 2;
  **`bestOfByRound: number[]`** — **um valor por rodada do MATA-MATA** (índice 0 = rodada mais cheia do
  bracket, último = final; cada valor 1/3/5, default todos 1; seu tamanho é `log2(qualifierCount)`, **não**
  `log2(size)` quando há fase de grupos — ver abaixo) — permite, por exemplo, todo o torneio em MD3 com a
  **final em MD5**; `bestOfFor(round)` resolve o valor da rodada; `championParticipantId` ao decidir a final),
  `TournamentParticipant` (displayName **único** = chave natural), `BracketSlot`
  (`round`/`position`/`matchId?`/`playerAId?`/`playerBId?`; round 0 = mais cheia, última = final). Domain
  services `BracketBuilder` (monta os slots: round 0 pareia os participantes, demais vazios) e `BracketAdvancer`
  (vencedor de (r,p) sobe pro pai (r+1, p/2), lado A/B). **Cada confronto do bracket É uma `Match` normal**
  (2 participantes, `bestOf` = `bestOfFor(round)` da sua rodada, `allowsDraw: false`, aposta parimutuel por
  confronto) — o `tournament` **não** importa `match`; quem cria/liquida as matches é o **backend** (camada
  de app).
  Criar/cancelar/declarar resultado é **admin-only** (`Create`/`Cancel` estendem `AdminUseCase`;
  `RecordBracketResult` é system, disparado só quando o confronto **realmente** se liquida); listar/ver é
  aberto. **Sem ciclo de módulo**: dependência só `tournament → match` — o resultado do confronto é
  declarado unidade por unidade numa **rota dedicada do tournament**
  (`/tournament/:id/matches/:matchId/result`, chamável mais de uma vez por confronto se `bestOf > 1`) que
  trava+registra a unidade via `MatchFacade`; só quando a match chega a `settled` (maioria atingida) é que
  a rota enfileira o pagamento das apostas e avança o torneio (bracket ou grupo, o que o `matchId` for —
  `Tournament.recordConfrontationResult` resolve), criando as matches da próxima rodada (ou, na primeira
  vez, o round 0 do mata-mata recém-montado pela fase de grupos).
  Matches do round 0 travam no `scheduledAt` do torneio; as das rodadas seguintes abrem quando a anterior
  encerra e travam após uma janela padrão. Reaproveita o worker (`settlement` + `match-lock`). Além da aposta
  por confronto, há a aposta **outright no campeão** (mercado `tournament_outright` do `betting`): quando a
  final é decidida, a rota de resultado enfileira o settlement do outright (`marketId` = torneio,
  `winningSelectionId` = campeão); cancelar o torneio estorna o outright.
  **Fase de grupos (> 32 participantes)**: acima de `GROUP_STAGE_THRESHOLD` (32 — pedido explícito: com 32
  já é mata-mata puro desde o 16-avos, então só 64 e 128 entram em grupos) o torneio **ganha** uma fase de
  grupos **antes** do bracket, sem alterar em nada o comportamento de 2/4/8/16/32 (`Tournament.hasGroupStage
  = size > 32`, tudo abaixo cai direto no bracket puro de sempre). Participantes divididos em **grupos de 4**
  (`GROUP_SIZE`, na ordem recebida — sem seeding), cada grupo joga **todos-contra-todos** (as 6 combinações,
  `GroupBuilder.build`, agendadas **todas de uma vez na criação** do torneio — ao contrário do bracket, o
  grupo inteiro é conhecido de antemão, sem depender de resultado anterior). Cada confronto de grupo também É
  uma `Match` normal (`bestOf` = `Tournament.groupStageBestOf`, que reaproveita `bestOfByRound[0]` — o grupo
  não tem rodadas próprias pra ter seu próprio valor —, `allowsDraw: false`) e é apostável/liquidável
  exatamente como um confronto de bracket, sem código extra no lado de apostas. `GroupMatchSlot`
  (`groupIndex`/`matchupIndex`/`playerAId`/`playerBId`/`matchId?`/`winnerParticipantId?`/`unitsWonByA`/
  `unitsWonByB` — os dois últimos alimentam o desempate) é parte do agregado, igual ao `BracketSlot`.
  **Classificação** (domain service `GroupStandingsCalculator.calculate`, puro/estático, mesmo padrão do
  `PayoutCalculator`): ordena por vitórias; empate desempata por **confronto direto** (só entre os empatados,
  não o grupo todo) e, se ainda inconclusivo (ex.: empate a 3), por **saldo de unidades** (`unitsWon −
  unitsLost`) do grupo inteiro; SE AINDA empatado (simetria total), por id do participante (ordem
  determinística, igual ao `LeaderboardCalculator`). Também serve de **classificação ao vivo** durante a fase
  de grupos (ignora confrontos ainda não resolvidos). Os **2 primeiros de cada grupo** avançam
  (`Tournament.startKnockoutFromGroups`, chamado automaticamente de dentro de
  `recordConfrontationResult` assim que o ÚLTIMO confronto de grupo se liquida): `GroupBuilder
  .seedKnockoutEntrants` pareia grupos consecutivos **cruzado** (1º do grupo N vs 2º do grupo N+1, 1º do
  N+1 vs 2º do N) pra garantir que os dois classificados do mesmo grupo nunca se enfrentem logo no round 0 —
  o resultado alimenta o mesmo `BracketBuilder.build` de sempre, sobre `qualifierCount = size / 2`
  (64 → 32 classificados → **o mesmo mata-mata de 16-avos** que um torneio de 32 já joga hoje; 128 → 64
  classificados → mais uma rodada, "32-avos"). Até a fase de grupos terminar, `Tournament.slots` fica
  **vazio** (`phase: 'group'`; vira `'knockout'` quando o bracket é montado) — sem linhas de bracket
  persistidas ainda, por isso o `update()` do repositório Prisma faz **upsert** nos slots (podem nascer só
  depois da criação do torneio, ao contrário do grupo, sempre criado por inteiro já na criação).

## Rotas HTTP

- **Nomes de rota em INGLÊS** (kebab-case). Ex.: `auth/{register,login,refresh}`,
  `user/me` (GET devolve a identidade básica; PATCH edita nickname/avatarUrl), `user/me/profile`
  (GET, cross-context — vitrine de perfil com nível/XP e vitórias/derrotas),
  `user/{change-password,logout,deactivate}`, `wallet/{me,deposit,withdraw}`,
  `wallet/deposit-limits` (GET lista os próprios; POST define/ajusta — jogo responsável),
  `wallet/self-exclusion` (GET consulta a autoexclusão ativa; POST inicia — jogo responsável),
  `match` (`/`, `/:id`
  [GET e PATCH], `/:id/lock`, `/:id/units` [registra o vencedor da próxima unidade do bestOf; devolve o
  `MatchDTO`, pode precisar ser chamada mais de uma vez], `/:id/cancel`),
  `bet` (`POST /` aposta em qualquer mercado; `/mine`; `/leaderboard` [ranking, `?limit=`, aberto a
  qualquer autenticado]; `POST /combo` e `/combo/mine` [bilhete múltiplo, odds fixas];
  `/stake-limit` [GET/POST, limite de aposta diário — jogo responsável]; `/match/:id` e
  `/match/:id/odds` e `/match/:id/odds/history`; `/tournament/:id`, `/tournament/:id/odds` e
  `/tournament/:id/odds/history` [outright]),
  `category` (`/` [GET aberto; POST admin], `/:id` [PATCH e DELETE admin]),
  `participant` (`/` [GET aberto — alimenta o picker; POST admin], `/:id` [PATCH e DELETE admin]),
  `tournament` (`/` [GET aberto; POST admin], `/:id` [GET], `/:id/cancel` [admin],
  `/:id/matches/:matchId/result` [admin — declara o vencedor do confronto]),
  `notification` (`GET /` [caixa de entrada própria, `?limit=`; devolve `{ unreadCount, items }` — serve
  o sininho e a tela], `POST /read-all`, `POST /:id/read`, `GET /stream` [**SSE**, ver abaixo — é a
  ÚNICA rota autenticada por token na **query string**, porque `EventSource` não manda header]),
  `admin/{deposits,withdrawals}`,
  `admin/users` (GET lista todas as contas — portaria) e `admin/users/:id/{approve,reject}`
  (libera / barra; `reject` também revoga acesso e derruba as sessões),
  `upload/{matchs [admin], receipts [usuário autenticado], participants [admin], avatars [usuário
  autenticado]}`.
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
- ⚠️ **Login com Google está DESLIGADO** (decisão do dono pro primeiro deploy — o OAuth client ainda
  não existe). **A chave É o interruptor**, não há flag separada pra esquecer de virar: com
  `GOOGLE_CLIENT_ID` vazio, `POST /auth/oauth/google` responde **404 puro** (`GoogleLoginGuard`, um
  recurso desligado não anuncia que existe) e o `GoogleOAuthVerifier` se recusa a rodar. Essa segunda
  tranca **não é redundância decorativa**: sem client id a `google-auth-library` **pula a checagem de
  audience** (`verifySignedJwtWithCertsAsync` só compara quando recebe um valor), então um ID token
  emitido pra qualquer outro app do Google passaria e abriria conta aqui. No front, o botão sai das
  duas telas por `NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED` (**default desligado**; `NEXT_PUBLIC_*` é inlinado
  no build, então ligar exige **rebuild do web**) e o provider do NextAuth nem é montado sem as
  credenciais. Esconder o botão sozinho **não protegeria nada** — a rota é o portão. Pra religar:
  criar o client no Google Cloud, preencher as três variáveis e reconstruir o web. Nada de código
  comentado pra achar e descomentar.
- **Login social (Google) NÃO muda nada do que está acima** — é só mais uma forma de chegar ao
  MESMO `accessToken`/`refreshToken`/cookie httpOnly de sempre. O NextAuth (`apps/web`) roda **só**
  o handshake OAuth com o Google (`/api/auth/[...nextauth]`, `lib/auth/options.ts`) — a sessão que
  ele cria é **descartável**, nunca a fonte de verdade: assim que autentica, o front lê o `idToken`
  da sessão do NextAuth (`useGoogleOAuthBridge`) e manda pro **backend** via `POST
  /auth/oauth/google` (chamada comum do navegador, `withCredentials: true`, igual o `/auth/login`)
  — e aí descarta a sessão do NextAuth (`signOut({ redirect: false })`), já com o token nosso em
  mãos. O backend **verifica o `idToken`** contra a JWKS do Google (`GoogleOAuthVerifier`,
  `google-auth-library`, porta `GoogleTokenVerifier` em `@auth/core` — nunca confia no que o
  client alega) e só então roda `LoginWithGoogle` (`@auth/core`), que emite a MESMA `AuthSession` +
  access/refresh do `LoginUser` — resposta idêntica (`{ accessToken }` + cookie). `User.password`
  é **opcional** (já era, na entidade) — vira `null` no banco pra quem só tem login social.
  **Vínculo de conta**: resolvido por `(provider, providerAccountId)` numa tabela própria
  (`OAuthAccount`) — no primeiro login com aquela conta Google, vincula (auto-link) a um `User` já
  existente com o MESMO e-mail **só se** o Google confirma `email_verified`, ou cria um `User` novo
  (sem senha) se não existir nenhum; um login seguinte já acha o `OAuthAccount` direto, sem tocar
  no e-mail de novo. Variáveis: `GOOGLE_CLIENT_ID` no backend (é o `audience` esperado do token) +
  `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`NEXTAUTH_URL`/`NEXTAUTH_SECRET` no `apps/web` (ver
  `.env.example` dos dois). **Apple ficou de fora** (Apple Developer Program é pago — decisão de
  não usar nada pago no projeto); o mesmo desenho (verificador de token + `LoginWithX` + tabela
  `OAuthAccount` reaproveitada) serve de molde se for adicionado depois.

## Banco de dados

- Prisma em **`packages/database`**: `prisma/schema.prisma` + client gerado em `generated/` (gitignored).
  Backend e worker fazem `import { PrismaClient } from 'database'`. Repos Prisma são adapters em cada app.
- **Models/tabelas previstas**: `User`(users; `password` nullable — null pra quem só entra via
  Google; `approval_status` com default `"approved"` **só por causa do `db push`**, ver a seção auth),
  `AuthSession`(auth_sessions), `OAuthAccount`(oauth_accounts; `@@unique([provider,
  providerAccountId])`, `userId` FK lógica igual `AuthSession`), `Wallet`(wallets),
  `LedgerEntry`(ledger_entries), `Payment`(payments), `DepositLimit`(deposit_limits; `@@unique([userId, period])`),
  `SelfExclusion`(self_exclusions; append-only), `Match`(matches), `MatchParticipant`(match_participants),
  `MatchUnit`(match_units; `unit_number` único por match), `Bet`(bets), `StakeLimit`(stake_limits;
  `bettorId` único — só janela diária), `OddsSnapshot`(odds_snapshots; append-only, histórico de odds),
  `ComboBet`(combo_bets),
  `ComboLeg`(combo_legs; relation Prisma intra-contexto pra `ComboBet`, mesmo padrão de `MatchUnit`),
  `Category`(categories, self-relation `parent_id`), `Participant`(participants; `name` `@unique`),
  `Tournament`(tournaments),
  `TournamentParticipant`(tournament_participants), `TournamentSlot`(tournament_slots; `match_id`/`player_a_id`/
  `player_b_id` são FKs lógicas), `TournamentGroupMatch`(tournament_group_matches; fase de grupos —
  `match_id`/`player_a_id`/`player_b_id`/`winner_participant_id` são FKs lógicas),
  `Notification`(notifications; `@@unique([userId, type, referenceId])` — é o que dá idempotência de
  entrega; `user_id` FK lógica). FKs entre contextos são **lógicas**
  (sem relation Prisma cruzando contexto — ex.: `matches.category_id`, `match_participants.participant_id`,
  `tournament_participants.participant_id`); a self-relation da `Category` é intra-contexto, então tem
  relation Prisma. Dinheiro em `Int` (centavos). Colunas snake_case via `@map`.
- **MIGRATIONS (TRAVADO) — nada de `db push`.** O schema evolui por migration versionada em
  `packages/database/prisma/migrations/`, commitada junto com a mudança do `schema.prisma`. O projeto
  nasceu com `db push` (greenfield, banco descartável), mas isso deixou de valer quando passou a haver
  dado real — saldo, ledger append-only e comprovante de depósito são material de auditoria, e
  `db push` conforma o banco ao schema sem registrar o caminho nem permitir voltar. O `prisma:push`
  foi **removido** do `packages/database/package.json` de propósito: com histórico versionado, um push
  aplicaria mudança sem registrar migration e faria o `migrate deploy` seguinte divergir.
  - **Mudou o schema?** `npm run db:migrate -- --name <descricao>` (= `prisma migrate dev`): cria a
    migration E aplica no banco de dev. Commite a pasta gerada.
  - **Subir o que falta** (boot de dev, deploy): `npm run db:deploy` (= `prisma migrate deploy`) —
    só replica migrations já commitadas, nunca cria nem edita uma. É o que o `npm run dev` roda e o
    que o Dockerfile do backend executa antes de servir tráfego.
  - **`0_init` é o BASELINE**: representa o schema que já existia no banco de produção quando as
    migrations foram adotadas. Num banco que veio da era do `db push`, ela é marcada como aplicada
    sem rodar (`npx prisma migrate resolve --applied 0_init`) — rodá-la tentaria recriar tabelas que
    já existem. Num banco zerado o `migrate deploy` a aplica normalmente. Os dois caminhos foram
    validados contra um Postgres 16 de verdade.
  - ⚠️ O default `"approved"` de `approval_status` é herança dessa era (ver a seção auth) — com
    migration, um caso desses passa a ser resolvido no SQL da própria migration (backfill explícito),
    não distorcendo o default da coluna.

## Worker e fila (settlement assíncrono)

- A liquidação (disparada pelo admin ao declarar o resultado da match, ou pela rota de resultado do torneio,
  ou pelo cancelamento) **enfileira** via porta `SettlementQueue` (produtor BullMQ no backend), com um job
  genérico `{ marketId, winningSelectionId, rakeBasisPoints, cancelled? }`. O **worker** consome a fila
  `settlement` e roda `SettleMarket`/`RefundMarket` através da facade do `betting`, aplicando o
  `PayoutCalculator` e persistindo tudo numa transação. Serve qualquer mercado (match ou outright do torneio),
  sem ramificar por tipo (a liquidação acha as apostas abertas por `marketId`).
- Os literais da fila precisam bater entre backend (produtor) e worker (consumidor). O worker **não** usa
  Groq/Playwright.
- A mesma transação do settlement grava as **notificações** de aposta/bilhete encerrado
  (`settlement-notifications.ts`), traduzindo os **eventos de domínio** que cada `Bet`/`ComboBet`
  registrou (`notificationsFor(bet.pullDomainEvents(), marketTitle)`) — ver a seção do contexto
  `notification` pra por que ali e não depois. O nome do mercado sai de **uma** consulta por
  liquidação (todas as apostas do lote são do mesmo mercado), com fallback genérico: título faltando
  nunca pode quebrar o pagamento. **Depois** do commit (fora do `tx`), o worker publica o ping ao
  vivo (`pushLiveUpdates`); a lista de destinatários é **rezerada a cada tentativa** porque o
  `inMoneyTransaction` re-executa o callback inteiro num conflito de escrita.

## Notificação ao vivo (SSE) — sem polling

**Não existe polling no front** (decisão do dono). O backend **empurra** um aviso e o front só
reage:

- **Redis pub/sub** é o transporte (`notifications-{userId}`, um canal por destinatário — nenhum
  filtro no cliente e zero chance de vazar a atividade de um pro outro). Redis e não um emitter em
  memória porque só ele funciona com **mais de uma instância** de backend: quem publica pode não ser
  quem segura a conexão do usuário. Backend publica em `notification/live-updates.ts`, worker em
  `settlement/live-updates.ts` (o literal do canal precisa bater entre os dois, igual aos nomes de
  fila). Publicar exige **conexão própria**: uma conexão em modo `subscribe` recusa comando normal.
- **O payload não tem significado** (`data: refresh`). O cliente relê `/notification`. Mandar o
  conteúdo da notificação duplicaria o read model em dois transportes.
- **SSE e não WebSocket**: o tráfego só vai num sentido (servidor → navegador) e o `EventSource`
  **reconecta sozinho** depois de queda/restart — exatamente o comportamento desejado, de graça.
- **Autenticação**: `EventSource` não manda header customizado, então o access token vai na **query
  string** — contrapartida aceita (é o MESMO token de 15min que já circula, direto pro nosso
  backend). Feito por **guard** (`StreamAuthGuard`) e não dentro do handler, porque guard roda antes
  e devolve **401 de verdade**; um handler `@Sse` **não pode ser async** (o Nest não faz `await` no
  retorno dele — ver `router-execution-context`). O guard repete as duas checagens do
  `AuthMiddleware` (JWT + reler a conta), então conta revogada não segura stream aberto.
- **`NotificationStreamController` fica FORA do `AuthMiddleware`** (que é aplicado por classe e é
  baseado em header) — daí ser um controller separado do `NotificationController`.
- **Não vaza conexão**: cada stream abre a sua conexão Redis e o teardown do `Observable` a fecha
  quando o cliente desconecta (medido: 8 → 11 → 8 clientes com 3 streams).
- Front: `useNotificationStream` montado **uma vez** no `(private)/layout.tsx`, invalidando a query
  `['notifications']` a cada ping. O token vive numa variável de módulo
  (`lib/api/interceptors.ts`), que um hook não consegue observar — então `setAccessToken` (porta
  única por onde login/refresh/logout passam) **avisa** os interessados via `onAccessTokenChange`, e
  o stream se reabre sozinho quando o token gira. **Nada de retry manual** no cliente: fechar o
  `EventSource` é justamente o que quebraria a reconexão nativa.
- Além do settlement, o worker consome a fila `match-lock`: `CreateMatch` agenda um job **atrasado**
  (delay = `scheduledAt − agora`) via porta `MatchLockQueue`; quando dispara, o worker roda
  `MatchFacade.autoLockMatch` (`AutoLockMatch`), travando as apostas no horário da partida.
- **Torneio reaproveita o worker sem código novo**: os confrontos do bracket são matches normais, então o
  auto-lock (`match-lock`) e o pagamento parimutuel (`settlement`) das apostas por confronto já
  funcionam. O **avanço do bracket** (subir o vencedor e criar as matches da próxima rodada) é **síncrono no
  backend** (na rota de resultado do torneio), não passa pela fila.

## Uploads (armazenamento local, sem nuvem)

- Arquivos ficam em **`apps/backend/uploads/<tema>/`** (ex.: `uploads/matchs`, `uploads/receipts`),
  servidos estáticos em **`/uploads/**`** via `app.useStaticAssets` (o `main.ts` cria as subpastas no
  boot, lendo `UPLOADS_SUBDIRS`). A pasta é gitignored.
- Upload de imagem de match é **admin-only**: `UploadController` (`POST /upload/matchs`,
  `AuthMiddleware` + `AdminGuard`, `FileInterceptor` do multer com `diskStorage`, só `image/*`, limite
  de 5 MB) salva o arquivo com nome `uuid.ext` e devolve `{ url: '/uploads/matchs/<arquivo>' }`. A
  entidade guarda esse caminho relativo (`Match.imageUrl`); o front monta a URL absoluta com
  `lib/media.ts` (`mediaUrl`).
- Upload de **comprovante de depósito é do próprio usuário, NÃO admin**: `UploadReceiptController`
  (`POST /upload/receipts`, só `AuthMiddleware`, sem `AdminGuard`) aceita `image/*` **ou**
  `application/pdf`, limite de 10 MB, mesmo padrão de nome (`uuid.ext`) e devolve
  `{ url: '/uploads/receipts/<arquivo>' }`, guardado em `Payment.receiptUrl` (ver seção wallet).
- Upload de **foto de participante é admin-only**, mesmo padrão do de match: `POST
  /upload/participants` (`UploadController`, mesma classe do de match — só mais um `@Post`), devolve
  `{ url: '/uploads/participants/<arquivo>' }`, guardado em `Participant.imageUrl`.
- Novo tema = nova subpasta em `UPLOADS_SUBDIRS` (+ constante `<TEMA>_UPLOAD_DIR`) + controller (decidir
  se é admin-only ou do próprio usuário autenticado, caso a caso).
- **Recorte no cliente antes de subir (cropper)**: todo upload de IMAGEM (partida, torneio, avatar,
  participante) passa por um enquadramento — o usuário arrasta e dá zoom, e o que sobe é o recorte,
  não o arquivo original. Antes disso quem decidia o enquadramento era o `object-cover` do CSS, que
  cortava pelo centro e sumia com o assunto de fotos altas ou muito largas. Implementado **sem lib
  nova** (mesmo precedente do gráfico de odds em SVG puro): `apps/web/src/lib/image-crop.ts` tem a
  parte pura (presets + canvas) e `components/{image-cropper,image-picker}/` a UI — o `ImagePicker`
  substituiu o `<Field type="file">` nos formulários, e o campo do form virou `File | null`
  (alimentado por `form.setValue`, mesmo padrão do `CategoryPicker`/`ParticipantPicker`). Dois presets:
  `square` (1:1, saída máx 512×512 — avatar e participante) e `banner` (16:9, máx 1600×900 — partida e
  torneio). Saída sempre **JPEG q=0.9 chamado `crop.jpg`**: o nome importa porque o backend salva como
  `randomUUID() + extname(originalname)`, então um nome sem `.jpg` gravaria extensão mentirosa. Antes
  de desenhar, o canvas pinta o fundo de `#150d26` (`arcade-surface`) pra transparência de PNG não
  virar preto. O zoom mínimo é travado no "cobrir a janela", então **não existe recorte com faixa
  vazia**. Efeito colateral bem-vindo: reencodar derruba o peso, então foto de celular não esbarra
  mais no limite de 5 MB. Os cards de partida/torneio usam `aspect-video` (bate com o preset → zero
  corte extra); os **heros** de `matches/[id]` e `tournaments/[id]` mantêm `aspect-video
  max-h-[280px]`, ou seja **ainda cortam na vertical** em tela larga — limitação consciente, porque
  16:9 em largura total daria ~675px de altura e engoliria a página.
  ⚠️ O **comprovante de depósito fica FORA** do cropper: é documento (recortar prova de pagamento
  seria adulterar) e é o único upload que também aceita PDF.

## apps/web (Next.js SPA)

**Stack travada**: Next.js (App Router) + **Tailwind** + **TanStack Query** + **Axios** + **react-hook-form**.
**SEM zod** no front (validação de negócio já está no domínio; no front só validação de UI simples).

**`components/loading/`**: uma ficha `$` girando (`animate-coinSpin`), "CARREGANDO" com
cursor piscando (`animate-blink`) e uma barrinha de progresso indeterminada (`animate-sweep`,
keyframe que já existia na config e nunca tinha sido usada). **Três tamanhos, um por contexto de
uso** — nenhum aceita filho, então quem chama sempre escolhe um dos três:
`fullScreen` (`min-h-screen`, só as duas guardas de auth que rodam **antes** do shell (`Sidebar`/`Header`) montar —
`(private)/layout.tsx` e `(public)/layout.tsx` — ali não existe header ainda pra medir contra);
default sem prop (`h-full`, todo componente de página que faz `if (loading) return <Loading />`
**antes de qualquer outro JSX**, porque é o único filho do `<main>` do `(private)/layout.tsx`, que é uma caixa
`flex-1` cuja altura o próprio flexbox já calculou como "tela menos o header" — inclusive quando o
header quebra em 2 linhas numa tela estreita; é exatamente essa conta que uma altura fixa em `vh`
nunca acerta, e foi o que descentralizava o loading antigo dependendo da tela); `compact` (sem
altura própria, pra quando o loading é só uma seção dentro de uma página que já tem outra coisa
renderizada em volta — um card, uma lista, a aba de usuários do admin). **`flex flex-col
items-center justify-center`, nunca `grid place-items-center`**, apesar do ícone+texto serem dois
filhos empilhados: grid com linhas implícitas **estica cada linha pra dividir a caixa igualmente e
centraliza cada uma dentro da própria metade**, abrindo um vão errado entre o ícone e o texto —
`justify-content` do flex centraliza o par como um grupo só, que é o efeito certo.

> **Vocabulário do produto: "aposta", NUNCA "bilhete".** Decisão do dono — o texto que o usuário lê
> fala em *aposta simples* e *aposta múltipla*; "bilhete" foi varrido da interface inteira. No CÓDIGO
> o domínio segue em inglês (`ComboBet`, `ComboLeg`, `bet-slip`), e neste guia a palavra ainda aparece
> descrevendo esses tipos — o que não pode voltar é pra tela.

- **TODO componente é uma PASTA com `index.tsx`** — `components/button/index.tsx`, nunca
  `components/button.tsx`. É o que deixa cada componente carregar o que é dele sem virar um monte de
  arquivo solto na pasta de cima: `<componente>/hooks/` (o hook exclusivo dele) e `<componente>/data/`
  (constantes/config, ex.: `sidebar/data/nav-items.ts` e `sidebar/data/icons.tsx`). O import não muda
  (`@/components/button` resolve o `index.tsx`), então mover um componente pra pasta nunca mexe em quem
  o usa.
- **Visual ≠ lógica**: o `index.tsx`/`page.tsx` é só JSX; states, effects, handlers e chamadas moram
  num hook. **Onde o hook fica é o que diz de quem ele é**: hook de UMA tela → `<rota>/hooks/`; hook de
  UM componente → `<componente>/hooks/` (ex.: `use-bet-slip-panel` dentro do `bet-slip`,
  `use-notification-bell` dentro do sininho); só o que várias telas compartilham fica em `src/hooks/`
  (`use-categories`, `use-participants`, `use-notifications`, `use-profile-stats`, `use-self-exclusion`,
  as guardas de rota e o `use-notification-stream`). Hook usado por vários pontos da MESMA rota (o
  `page.tsx` **e** um sub-componente) fica em `<rota>/hooks/`, irmão do `page.tsx` — não tem "componente
  raiz" pra ser dono dele. **Duas exceções**, e só essas: chamada ISOLADA de hook de terceiro sem
  nenhum state/handler seu ao lado, e **função pura** de formatação de apresentação (não é lógica no
  sentido da regra) — as duas podem ficar inline no arquivo visual.
- **`hooks/`, `data/` e `types/` sempre com nome descritivo** (`use-bet-slip-panel.ts`,
  `nav-items.ts`) — **nunca** um `index.ts` dentro delas: a pasta pode ter mais de um arquivo, então
  um "index" único não faria sentido. Só o **componente** tem `index.tsx`.
- **Pasta de sub-componente nunca aninha dentro da pasta de outro sub-componente** — todas irmãs,
  direto em `<rota>/components/` (ou em `src/components/`), mesmo quando um só é usado pelo outro
  (`group-stage` importa `../group-match-card`, não um `group-stage/group-match-card/`).
- **As quatro pastas de um componente/rota, e quando cada uma existe**: `hooks/` (se tem lógica
  própria), `data/` (se tem dado fixo próprio), `types/` (se tem interface **exportada** e lida por
  mais de um arquivo dali) e, na ROTA, `lib/` (se tem função pura usada só por aquela rota — ex., no
  projeto de referência, um `jobs/lib/parse-bulk-file.ts`). Nenhuma é obrigatória: cria quando o caso
  aparece. ⚠️ **`<rota>/types/` e `<rota>/lib/` ainda NÃO existem neste projeto** — não porque a regra
  não valha, mas porque o caso não apareceu: até aqui todo tipo local é interface de formulário/props
  (fica inline) ou tipo de uma constante (fica no `data/`, ver abaixo), e toda função pura é usada por
  mais de uma tela (fica em `src/lib/`). Quando aparecer um **modelo de dado** próprio da rota ou uma
  função pura exclusiva dela, é lá que vai — não invente um `src/types/` global nem empurre pro hook.
- **Dado fixo (array de opções, mapa de estilo, tabela de rótulos) SEMPRE em `data/`** — nunca solto
  no topo de um `.tsx`/`.ts`. Um arquivo por grupo coeso (`match-filters.ts`, `round-labels.ts`), nunca
  um `constants.ts` genérico. O nível segue **quem usa**: `data/` do componente (uso local, ex.
  `BUTTON_VARIANT_CLASSES` em `button/data/` — nunca num `components/data/` misturando componentes),
  `data/` da rota (vários componentes da mesma rota) ou `src/data/` global (usado por **rotas
  diferentes**, ou por dois componentes independentes que o `layout.tsx` monta sem um dono comum).
  **Escalar de ajuste local** (`BADGE_CAP = 99`, `INBOX_SIZE = 100`, chave de query `['wallet']`) pode
  ficar inline junto de quem usa — a regra é sobre estrutura de dado, não sobre todo `const` maiúsculo.
  ⚠️ **Dado igual em duas rotas é sempre bug esperando acontecer**: `ROUND_LABELS` e
  `GROUP_STAGE_THRESHOLD` estavam copiados entre `tournaments` e `tournaments/[id]`, e
  `MATCH_DRAW_SELECTION_ID` entre `matches/[id]` e o combo — os três foram pro `src/data/` global.
- **Tipo união que enumera um dado mora JUNTO do dado, no `data/`** — `ButtonVariant` com
  `BUTTON_VARIANT_CLASSES`, `MatchFilter` com `MATCH_FILTERS`, `SlipMode` com `MODES`, `InboxFilter`
  com `FILTERS`. O `types/` é pra **modelo de dado** que não é o tipo de nenhuma constante (ainda não
  apareceu nenhum aqui). Props que só o próprio arquivo lê (sem `export`) ficam inline — não move.
- **JSX de wrapper repetido entre `page.tsx` do MESMO route group sobe pro `layout.tsx` do grupo** —
  se a moldura é igual pra todo mundo do grupo, duplicá-la em cada `page.tsx` só porque cada rota tem
  o seu arquivo é repetição à toa. Foi o caso do `(public)`: `login`, `register` e `pending` repetiam
  o mesmo `<main>` de fundo radial + o card `max-w-md` centralizado; isso foi pro `(public)/layout.tsx`
  (que já existia pra fazer o guard) e cada `page.tsx` ficou só com o que é dele. ⚠️ A guarda de
  `Loading fullScreen` fica **fora** desse wrapper — ela reivindica a viewport inteira e o `max-w-md`
  do card a espremeria. O `<h1>` do DEVS·BET **não** subiu: parece igual, mas o `pending` usa
  `mb-1.5` (tem um kicker acima) contra `mb-8` dos outros — a regra é sobre JSX **idêntico**.
- **Dado estático → `data/`; lógica (parse, cálculo, formatação) → `lib/`.** Paleta/constante que é a
  implementação privada de uma função pura continua junto dela no `lib/` (ex. o `PALETTE` de
  `participant-colors.ts`) — separar o dado da única função que o consome não ajuda ninguém.
- **`page.tsx` É a tela** — ele mesmo tem o JSX e chama o hook da rota; não existe um
  `components/<rota>.tsx` que é só o wrapper da página inteira (era uma indireção sem ganho: um arquivo
  a mais pra abrir e nenhuma reutilização). `<rota>/components/` guarda só os **pedaços** da tela
  (`wallet/components/deposit-limits/`, `tournaments/[id]/components/bracket-slot-card/`).
- **Não existe `AppShell`**: o cromo da área privada são dois componentes independentes,
  `components/sidebar/` e `components/header/`, compostos direto no `(private)/layout.tsx` (que é
  também quem monta o `BetSlipProvider` e abre o SSE). Um componente que só embrulha outros dois não
  ganha nada por existir, e escondia o layout de quem procura por ele no `layout.tsx`.
- **Route groups por acesso**: `app/(public)/` (login/register) e `app/(private)/` (dashboard, match, wallet,
  bet, tournament). Guard no `layout.tsx` do grupo, nunca por página.
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

- `npm run dev` = `db:up` (Postgres + Redis no docker, via `apps/database` = workspace `container-db`,
  que só chama `docker compose -f docker-compose.yml up/stop db redis`) → `db:deploy`
  (`prisma migrate deploy`, aplica as migrations pendentes) → `turbo run dev`.
- **Stack inteiro containerizado** (`docker-compose.yml` na raiz + um `Dockerfile` por app em
  `apps/{backend,worker,web}`, build context = raiz do repo): `docker compose up --build` sobe
  Postgres, Redis, backend, worker e web juntos — útil pra simular produção ou rodar sem instalar
  Node localmente. `NEXT_PUBLIC_API_URL` é `ARG` (Next.js inline em build time); as demais variáveis
  (incl. `NEXTAUTH_*`/`GOOGLE_CLIENT_*` do web, lidas em runtime pela rota do NextAuth) vêm do
  `env_file` de cada app. `.env.example` na raiz cobre as credenciais do Postgres
  (`POSTGRES_USER`/`PASSWORD`/`DB`) que o compose interpola no `DATABASE_URL` de backend/worker.
  **Validado de verdade em 2026-08-12** (antes disso nunca tinha rodado), e o que a validação
  descobriu — tudo já corrigido, mas cada item é uma armadilha que volta se alguém mexer:
  - **Todo Dockerfile PRECISA de `RUN npm ci`.** O `.dockerignore` exclui `node_modules`, então sem
    isso a imagem não tem dependência nenhuma e o build morre com **exit 127** (`tsup`/`next` não
    encontrado) no primeiro pacote do workspace. O do `web` estava sem, e não buildava.
  - **`.dockerignore`: padrão sem `**/` só casa na RAIZ.** `.env` sozinho deixava
    `apps/backend/.env`, `apps/web/.env` e `packages/database/.env` entrarem na imagem (JWT_SECRET,
    NEXTAUTH_SECRET, chave Pix). Os `**/.env` são obrigatórios; conferir com
    `docker run --rm --entrypoint sh <img> -c 'ls /repo/apps/backend/.env'` deve dar "No such file".
  - **`uploads` é volume nomeado** (`uploads_data`) — sem ele, recriar o container **apaga todo
    comprovante de depósito** (prova de pagamento), avatar e imagem de partida. E a pasta precisa
    existir **e pertencer ao `node`** na imagem (o `RUN mkdir -p ... && chown` no Dockerfile do
    backend): o volume herda dono do que a imagem tem naquele caminho, e como o processo roda como
    `node`, um volume `root` derruba o backend no boot com `EACCES` em `mkdir`. Se mudar isso,
    **apagar o volume** pra ele reinicializar (`docker volume rm devs-bet_uploads_data`).
  - **O schema é aplicado no BOOT do backend**, pelo `CMD` do seu Dockerfile
    (`prisma migrate deploy && npm start`) — não existe mais passo manual. A objeção antiga
    ("nada de dev vaza pro ambiente de produção") era contra o `db push`, que é comando de
    desenvolvimento; `migrate deploy` é o de produção: só replica migrations commitadas, nunca gera
    nem edita nada. Se falhar, o container **não sobe** — melhor que servir com o schema errado.
    ⚠️ Só o backend migra; o worker sobe sem migrar (o Prisma serializa por advisory lock, e na
    prática o worker só age em job que o backend já enfileirou).
- **Reverse proxy: `deploy/nginx.conf`** (Nginx nativo no host da VPS, fora do Docker; front e API no
  MESMO domínio, com `/api/*` indo pro backend). Três coisas ali **não são opcionais**, e as três
  foram validadas rodando um Nginx de verdade com essa config na frente do stack:
  - **`client_max_body_size 10m`** — o default do Nginx é **1 MB**, e o comprovante aceita até 10 MB.
    Sem isso, foto de celular/PDF toma **413 no proxy** e nem chega no backend (reproduzido: 413
    antes, 201 depois, com um arquivo de 2 MB).
  - **Bloco próprio pro SSE** (`location = /api/notification/stream`) com `proxy_buffering off`,
    `proxy_http_version 1.1` + `Connection ''` e `proxy_read_timeout` longo. Com o buffering ligado
    (default) o Nginx segura os eventos e o sininho parece travado — exatamente o sintoma que o push
    veio resolver. Medido depois: push chega em **~0,6 s** através do proxy.
  - **`X-Accel-Buffering: no`** no próprio handler (`@Header` no `NotificationStreamController`) —
    cinto e suspensório: mantém o stream funcionando mesmo atrás de um proxy que ninguém configurou.
    O Nginx **consome** esse header, então ele não aparece na resposta final; pra conferir, bater
    direto no backend.
  ⚠️ Enquanto o Nginx estiver em `listen 80` sem TLS, o **login não persiste**: o cookie de refresh é
  `secure` (`NODE_ENV=production` no Dockerfile), e o navegador não guarda cookie `secure` em HTTP.
  Rodar o `certbot` antes de usar pra valer.
  ⚠️ Portas do compose (`5433`/`6380`/`5001`/`3003` no host) são **só o mapeamento pro host**. A
  comunicação entre containers usa as portas INTERNAS (`db:5432`, `redis:6379`) — trocar isso no
  `DATABASE_URL`/`REDIS_URL` derruba a conexão.
- **Antes de declarar pronto** (não bootar servidor — precisa de Postgres/Redis):
  ```bash
  npx turbo run check-types test build
  ```
  Tudo verde = ok.

## Commits

`tipo(escopo): assunto`, escopo = caminho do pacote/app (ex.: `feat(packages/wallet/core)`), mensagem em
português, corpo enxuto, **um commit por escopo**, **sem rodapé de co-autoria**.
