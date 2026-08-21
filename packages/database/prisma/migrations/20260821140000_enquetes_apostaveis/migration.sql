-- CreateTable
CREATE TABLE "polls" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "resolution_criteria" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "image_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "rake_basis_points" INTEGER NOT NULL DEFAULT 0,
    "winning_option_id" TEXT,
    "closes_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "closed_at" TIMESTAMP(3),
    "settled_at" TIMESTAMP(3),

    CONSTRAINT "polls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poll_options" (
    "id" TEXT NOT NULL,
    "poll_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "poll_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "polls_creator_id_idx" ON "polls"("creator_id");

-- CreateIndex
CREATE INDEX "polls_category_id_idx" ON "polls"("category_id");

-- CreateIndex
CREATE INDEX "poll_options_poll_id_idx" ON "poll_options"("poll_id");

-- AddForeignKey
ALTER TABLE "poll_options" ADD CONSTRAINT "poll_options_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

