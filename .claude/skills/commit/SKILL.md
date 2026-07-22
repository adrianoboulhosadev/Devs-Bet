---
name: commit
description: Cria commits no padrão do Devs-Bet — Conventional Commits com o escopo = bounded context/pacote afetado (ex.: feat(packages/wallet/core), feat(packages/betting/adapters), fix(apps/backend)). Sempre em português, com corpo detalhado porém enxuto. Use sempre que for commitar mudanças neste monorepo.
---

# Padrão de commit — Devs-Bet

## Formato
```
<tipo>(<escopo>): <assunto curto em português>

- <ponto 1: o que foi feito, com detalhe enxuto>
- <ponto 2>
```

- **tipo**: `feat` (novo comportamento), `fix` (correção de bug), `refactor` (sem mudar comportamento), `test` (só testes), `chore` (config/build/deps), `docs`, `perf`, `style`.
- **escopo**: o **caminho do bounded context / pacote / app** afetado, exatamente como na árvore do repo:
  - `packages/shared`
  - `packages/database`
  - `packages/<contexto>/core` — ex.: `packages/auth/core`, `packages/wallet/core`, `packages/match/core`, `packages/betting/core`
  - `packages/<contexto>/adapters` — ex.: `packages/auth/adapters`, `packages/betting/adapters`
  - `apps/backend`, `apps/worker`, `apps/web`, `apps/database`
- **assunto**: curto, em **português**, no imperativo/presente, sem ponto final. (ex.: `adiciona use case de login`, `corrige hold da carteira ao apostar`).

## Regras

1. **Sempre em português** — assunto e corpo.
2. **Um commit por bounded context / pacote.** Se a mudança tocou `core` E `adapters` E `backend`, são **3 commits separados** (um por escopo), não um commit gigante. Faça o stage seletivo por caminho (`git add packages/wallet/core`, depois commitar; e assim por diante).
3. **Corpo detalhado porém enxuto**: bullets curtos explicando O QUE mudou e por quê quando não for óbvio. Citar nomes reais (use-cases, portas, VOs, entidades, arquivos). Nada de encher linguiça; 1–5 bullets costuma bastar.
4. Sem escopo só quando a mudança é genuinamente cross-repo (ex.: `chore: ajusta turbo.json`). Prefira sempre ter escopo.
5. Não commitar `dist/`, `generated/`, `.env`, `node_modules` (já no .gitignore).
6. Commitar **só** quando o dono pedir.
7. **NUNCA** adicionar rodapé de atribuição/co-autoria (nada de `Co-authored-by`, `Generated with Claude Code` ou similar). A mensagem termina no último bullet do corpo.

## Exemplos

```
feat(packages/auth/core): adiciona use case de alterar senha

- ChangePassword: valida senha antiga, exige nova forte e diferente da atual
- erros via Errors.INVALID_PASSWORD / PASSWORD_SAME_AS_PREVIOUS
- testes em memória cobrindo os caminhos de erro e o sucesso
```

```
feat(packages/wallet/core): entidade Wallet com hold e release

- Wallet.hold(stake) lança INSUFFICIENT_BALANCE quando available < stake
- release/creditWinnings ajustam balance/held mantendo a invariante de não-negativo
- LedgerEntry append-only registrando cada transição
```

```
fix(apps/backend): corrige reconstituição da Wallet no repositório Prisma

- lia balance como reais -> passa a ler os centavos direto da coluna Int
```

## Fluxo
1. `git status` + `git diff` para ver o que mudou e agrupar por escopo.
2. Para cada escopo: `git add <caminho>` → `git commit -m "..."` (use o formato acima).
3. Repita até o working tree estar limpo. Confirme com `git status`.
