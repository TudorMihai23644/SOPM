-- AlterTable
ALTER TABLE "history_log" ADD COLUMN     "note" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "last_streak_day" VARCHAR(10),
ADD COLUMN     "streak_days" INTEGER NOT NULL DEFAULT 0;
