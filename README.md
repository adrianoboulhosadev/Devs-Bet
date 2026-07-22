# Devs-Bet

Plataforma de apostas **entre amigos**: você cria uma partida (uma luta, um 1v1 de
videogame, um free-for-all com vários jogadores), os amigos apostam em quem vence, e
quem acerta ganha. O saldo é abastecido via **Pix** e as apostas movimentam esse saldo.

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
invariantes no modelo). Contextos: `auth`, `wallet`, `match`, `betting`.

Deployables de produção: **backend** (API NestJS) e **worker** (settlement assíncrono
via BullMQ). O **web** é o front (Next.js). `database` (Postgres + Redis) sobe via docker
no dev.

Detalhes de engenharia e regras travadas: veja `CLAUDE.md`.
