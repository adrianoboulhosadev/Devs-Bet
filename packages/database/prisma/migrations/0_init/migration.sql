-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "nickname" TEXT,
    "avatar_url" TEXT,
    "approval_status" TEXT NOT NULL DEFAULT 'approved',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "verifier_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "reference_id" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "held" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reference_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reference_code" TEXT NOT NULL,
    "receipt_url" TEXT,
    "confirmed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposit_limits" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "pending_amount" INTEGER,
    "effective_at" TIMESTAMP(3),

    CONSTRAINT "deposit_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "self_exclusions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "until" TIMESTAMP(3),

    CONSTRAINT "self_exclusions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nickname" TEXT,
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "image_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "rake_basis_points" INTEGER NOT NULL DEFAULT 0,
    "best_of" INTEGER NOT NULL DEFAULT 1,
    "allows_draw" BOOLEAN NOT NULL DEFAULT true,
    "winner_participant_id" TEXT,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "locked_at" TIMESTAMP(3),
    "settled_at" TIMESTAMP(3),

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_participants" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "nickname" TEXT,
    "image_url" TEXT,

    CONSTRAINT "match_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_units" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "unit_number" INTEGER NOT NULL,
    "winner_participant_id" TEXT,

    CONSTRAINT "match_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bets" (
    "id" TEXT NOT NULL,
    "market_type" TEXT NOT NULL DEFAULT 'match',
    "market_id" TEXT NOT NULL,
    "bettor_id" TEXT NOT NULL,
    "selection_id" TEXT NOT NULL,
    "stake" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "payout" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settled_at" TIMESTAMP(3),

    CONSTRAINT "bets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "odds_snapshots" (
    "id" TEXT NOT NULL,
    "market_id" TEXT NOT NULL,
    "selection_id" TEXT NOT NULL,
    "pool" INTEGER NOT NULL,
    "total_pool" INTEGER NOT NULL,
    "implied_odd" DOUBLE PRECISION NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "odds_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stake_limits" (
    "id" TEXT NOT NULL,
    "bettor_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "pending_amount" INTEGER,
    "effective_at" TIMESTAMP(3),

    CONSTRAINT "stake_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combo_bets" (
    "id" TEXT NOT NULL,
    "bettor_id" TEXT NOT NULL,
    "stake" INTEGER NOT NULL,
    "total_odd" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "payout" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settled_at" TIMESTAMP(3),

    CONSTRAINT "combo_bets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combo_legs" (
    "id" TEXT NOT NULL,
    "combo_bet_id" TEXT NOT NULL,
    "market_type" TEXT NOT NULL DEFAULT 'match',
    "market_id" TEXT NOT NULL,
    "selection_id" TEXT NOT NULL,
    "odd" DOUBLE PRECISION NOT NULL,
    "result" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "combo_legs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournaments" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "image_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "size" INTEGER NOT NULL,
    "rake_basis_points" INTEGER NOT NULL DEFAULT 0,
    "best_of_by_round" INTEGER[] DEFAULT ARRAY[1]::INTEGER[],
    "champion_participant_id" TEXT,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_participants" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "nickname" TEXT,
    "image_url" TEXT,

    CONSTRAINT "tournament_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_slots" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "match_id" TEXT,
    "player_a_id" TEXT,
    "player_b_id" TEXT,

    CONSTRAINT "tournament_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_group_matches" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "group_index" INTEGER NOT NULL,
    "matchup_index" INTEGER NOT NULL,
    "player_a_id" TEXT NOT NULL,
    "player_b_id" TEXT NOT NULL,
    "match_id" TEXT,
    "winner_participant_id" TEXT,
    "units_won_by_a" INTEGER NOT NULL DEFAULT 0,
    "units_won_by_b" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tournament_group_matches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions"("user_id");

-- CreateIndex
CREATE INDEX "oauth_accounts_user_id_idx" ON "oauth_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_accounts_provider_provider_account_id_key" ON "oauth_accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_user_id_type_reference_id_key" ON "notifications"("user_id", "type", "reference_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_key" ON "wallets"("user_id");

-- CreateIndex
CREATE INDEX "ledger_entries_wallet_id_idx" ON "ledger_entries"("wallet_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_reference_code_key" ON "payments"("reference_code");

-- CreateIndex
CREATE INDEX "payments_user_id_idx" ON "payments"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "deposit_limits_user_id_period_key" ON "deposit_limits"("user_id", "period");

-- CreateIndex
CREATE INDEX "self_exclusions_user_id_idx" ON "self_exclusions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "participants_name_key" ON "participants"("name");

-- CreateIndex
CREATE INDEX "matches_creator_id_idx" ON "matches"("creator_id");

-- CreateIndex
CREATE INDEX "matches_category_id_idx" ON "matches"("category_id");

-- CreateIndex
CREATE INDEX "match_participants_match_id_idx" ON "match_participants"("match_id");

-- CreateIndex
CREATE INDEX "match_units_match_id_idx" ON "match_units"("match_id");

-- CreateIndex
CREATE UNIQUE INDEX "match_units_match_id_unit_number_key" ON "match_units"("match_id", "unit_number");

-- CreateIndex
CREATE INDEX "bets_market_id_idx" ON "bets"("market_id");

-- CreateIndex
CREATE INDEX "bets_bettor_id_idx" ON "bets"("bettor_id");

-- CreateIndex
CREATE INDEX "odds_snapshots_market_id_recorded_at_idx" ON "odds_snapshots"("market_id", "recorded_at");

-- CreateIndex
CREATE UNIQUE INDEX "stake_limits_bettor_id_key" ON "stake_limits"("bettor_id");

-- CreateIndex
CREATE INDEX "combo_bets_bettor_id_idx" ON "combo_bets"("bettor_id");

-- CreateIndex
CREATE INDEX "combo_legs_combo_bet_id_idx" ON "combo_legs"("combo_bet_id");

-- CreateIndex
CREATE INDEX "combo_legs_market_id_idx" ON "combo_legs"("market_id");

-- CreateIndex
CREATE INDEX "categories_parent_id_idx" ON "categories"("parent_id");

-- CreateIndex
CREATE INDEX "tournaments_creator_id_idx" ON "tournaments"("creator_id");

-- CreateIndex
CREATE INDEX "tournaments_category_id_idx" ON "tournaments"("category_id");

-- CreateIndex
CREATE INDEX "tournament_participants_tournament_id_idx" ON "tournament_participants"("tournament_id");

-- CreateIndex
CREATE INDEX "tournament_slots_tournament_id_idx" ON "tournament_slots"("tournament_id");

-- CreateIndex
CREATE INDEX "tournament_slots_match_id_idx" ON "tournament_slots"("match_id");

-- CreateIndex
CREATE INDEX "tournament_group_matches_tournament_id_idx" ON "tournament_group_matches"("tournament_id");

-- CreateIndex
CREATE INDEX "tournament_group_matches_match_id_idx" ON "tournament_group_matches"("match_id");

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_units" ADD CONSTRAINT "match_units_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combo_legs" ADD CONSTRAINT "combo_legs_combo_bet_id_fkey" FOREIGN KEY ("combo_bet_id") REFERENCES "combo_bets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_slots" ADD CONSTRAINT "tournament_slots_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_group_matches" ADD CONSTRAINT "tournament_group_matches_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

