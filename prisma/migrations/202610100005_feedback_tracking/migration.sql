ALTER TABLE "Feedback" ADD COLUMN "trackingHash" TEXT;
CREATE UNIQUE INDEX "Feedback_trackingHash_key" ON "Feedback"("trackingHash");

CREATE TABLE "PublicReply" (
  "id" TEXT NOT NULL,
  "feedbackId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PublicReply_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PublicReply_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "Feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PublicReply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PublicReply_feedbackId_requestId_key" ON "PublicReply"("feedbackId", "requestId");
CREATE INDEX "PublicReply_feedbackId_createdAt_id_idx" ON "PublicReply"("feedbackId", "createdAt", "id");
