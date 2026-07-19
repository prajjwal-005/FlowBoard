-- DropForeignKey
ALTER TABLE "activity_logs" DROP CONSTRAINT "activity_logs_userID_fkey";

-- DropIndex
DROP INDEX "board_members_role_idx";

-- DropIndex
DROP INDEX "tasks_columnID_idx";

-- CreateIndex
CREATE INDEX "tasks_columnID_order_idx" ON "tasks"("columnID", "order");
