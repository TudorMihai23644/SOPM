-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "completed_from" "TaskStatus",
ADD COLUMN     "undo_used" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "history_log_user_id_event_at_idx" ON "history_log"("user_id", "event", "at");

-- CreateIndex
CREATE INDEX "tasks_status_deadline_at_idx" ON "tasks"("status", "deadline_at");
