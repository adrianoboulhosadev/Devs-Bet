-- Backfill: confrontos de torneio criados ANTES de a herança de imagem existir
-- ficaram com image_url nulo, aparecendo sem banner no lobby e na própria
-- partida. A criação já copia a imagem do torneio (ver TournamentController),
-- então isto só alcança o que ficou para trás.
--
-- Só preenche onde a partida NÃO tem imagem própria: uma partida avulsa, ou um
-- confronto que por algum motivo ganhou banner próprio, fica intocado.

-- Confrontos do mata-mata (bracket).
UPDATE "matches" AS m
SET "image_url" = t."image_url"
FROM "tournament_slots" AS s
JOIN "tournaments" AS t ON t."id" = s."tournament_id"
WHERE s."match_id" = m."id"
  AND m."image_url" IS NULL
  AND t."image_url" IS NOT NULL;

-- Confrontos da fase de grupos.
UPDATE "matches" AS m
SET "image_url" = t."image_url"
FROM "tournament_group_matches" AS g
JOIN "tournaments" AS t ON t."id" = g."tournament_id"
WHERE g."match_id" = m."id"
  AND m."image_url" IS NULL
  AND t."image_url" IS NOT NULL;
