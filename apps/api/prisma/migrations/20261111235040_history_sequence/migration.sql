-- DropIndex
DROP INDEX "history_log_user_id_at_idx";

-- AlterTable
ALTER TABLE "history_log" ADD COLUMN     "seq" BIGSERIAL NOT NULL;

-- CreateIndex
CREATE INDEX "history_log_user_id_at_seq_idx" ON "history_log"("user_id", "at", "seq");
