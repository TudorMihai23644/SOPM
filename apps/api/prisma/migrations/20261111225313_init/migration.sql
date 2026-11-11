-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('UPCOMING', 'COMPLETED', 'CANCELLED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "LedgerKind" AS ENUM ('XP', 'COINS', 'HP');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Bucharest',
    "xp_total" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "hp" INTEGER NOT NULL DEFAULT 100,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "deadline_at" TIMESTAMP(3) NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'UPCOMING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "overdue_at" TIMESTAMP(3),
    "postpone_count" INTEGER NOT NULL DEFAULT 0,
    "hp_penalty_applied" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "history_log" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "task_id" UUID,
    "task_title" VARCHAR(120) NOT NULL,
    "event" TEXT NOT NULL,
    "from_status" "TaskStatus",
    "to_status" "TaskStatus",
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "history_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_ledger" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "LedgerKind" NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "ref_type" TEXT NOT NULL,
    "ref_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reward_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_stamina" (
    "user_id" UUID NOT NULL,
    "game_day" DATE NOT NULL,
    "xp_awarded" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "daily_stamina_pkey" PRIMARY KEY ("user_id","game_day")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_config" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "app_config_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_nickname_key" ON "users"("nickname");

-- CreateIndex
CREATE INDEX "tasks_owner_id_status_deadline_at_idx" ON "tasks"("owner_id", "status", "deadline_at");

-- CreateIndex
CREATE INDEX "history_log_user_id_at_idx" ON "history_log"("user_id", "at");

-- CreateIndex
CREATE UNIQUE INDEX "reward_ledger_user_id_kind_reason_ref_type_ref_id_key" ON "reward_ledger"("user_id", "kind", "reason", "ref_type", "ref_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "history_log" ADD CONSTRAINT "history_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "history_log" ADD CONSTRAINT "history_log_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_ledger" ADD CONSTRAINT "reward_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_stamina" ADD CONSTRAINT "daily_stamina_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Constrângeri din specificații pe care Prisma nu le poate exprima în schema.
ALTER TABLE "users" ADD CONSTRAINT "users_hp_range" CHECK ("hp" BETWEEN 0 AND 100);
ALTER TABLE "users" ADD CONSTRAINT "users_coins_non_negative" CHECK ("coins" >= 0);
ALTER TABLE "users" ADD CONSTRAINT "users_xp_non_negative" CHECK ("xp_total" >= 0);
ALTER TABLE "users" ADD CONSTRAINT "users_level_positive" CHECK ("level" >= 1);
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_title_length" CHECK (char_length("title") BETWEEN 1 AND 120);
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_postpone_count_range" CHECK ("postpone_count" BETWEEN 0 AND 2);
ALTER TABLE "daily_stamina" ADD CONSTRAINT "daily_stamina_xp_range" CHECK ("xp_awarded" BETWEEN 0 AND 150);
