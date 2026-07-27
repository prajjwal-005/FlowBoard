-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userID" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "boardID" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "entityID" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userID_idx" ON "Notification"("userID");
