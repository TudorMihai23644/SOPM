-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('LEADER', 'MEMBER');

-- CreateEnum
CREATE TYPE "QuestStatus" AS ENUM ('OPEN', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ParticipantStatus" AS ENUM ('PENDING', 'OVERDUE', 'AWAITING_REVIEW', 'VALIDATED', 'EXCUSED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "last_rollover_day" VARCHAR(10);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL,
    "name" VARCHAR(30) NOT NULL,
    "invite_code" VARCHAR(6) NOT NULL,
    "leader_id" UUID NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "team_xp" INTEGER NOT NULL DEFAULT 0,
    "vault_coins" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "team_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("team_id","user_id")
);

-- CreateTable
CREATE TABLE "quests" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "creator_id" UUID,
    "title" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "deadline_at" TIMESTAMP(3) NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "status" "QuestStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "bonus_granted_at" TIMESTAMP(3),

    CONSTRAINT "quests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quest_participants" (
    "quest_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "ParticipantStatus" NOT NULL DEFAULT 'PENDING',
    "done_at" TIMESTAMP(3),
    "done_late" BOOLEAN NOT NULL DEFAULT false,
    "overdue_at" TIMESTAMP(3),
    "hp_penalty_applied" BOOLEAN NOT NULL DEFAULT false,
    "validator_id" UUID,
    "validated_at" TIMESTAMP(3),
    "reject_reason" VARCHAR(200),
    "auto_validated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "quest_participants_pkey" PRIMARY KEY ("quest_id","user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "teams_invite_code_key" ON "teams"("invite_code");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_user_id_key" ON "team_members"("user_id");

-- CreateIndex
CREATE INDEX "quests_team_id_status_deadline_at_idx" ON "quests"("team_id", "status", "deadline_at");

-- CreateIndex
CREATE INDEX "quests_status_deadline_at_idx" ON "quests"("status", "deadline_at");

-- CreateIndex
CREATE INDEX "quest_participants_user_id_status_idx" ON "quest_participants"("user_id", "status");

-- CreateIndex
CREATE INDEX "quest_participants_status_done_at_idx" ON "quest_participants"("status", "done_at");

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quests" ADD CONSTRAINT "quests_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quests" ADD CONSTRAINT "quests_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quest_participants" ADD CONSTRAINT "quest_participants_quest_id_fkey" FOREIGN KEY ("quest_id") REFERENCES "quests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quest_participants" ADD CONSTRAINT "quest_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quest_participants" ADD CONSTRAINT "quest_participants_validator_id_fkey" FOREIGN KEY ("validator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
