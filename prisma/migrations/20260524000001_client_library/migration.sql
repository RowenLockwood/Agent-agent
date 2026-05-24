-- Migration: replace old Author model with new Author + EditorOutreach models.
-- Safe for clean-slate databases (no existing data preserved).

-- Drop old Author table (name, title, editor, publisher replaced by
-- firstName/lastName, headAgentEmail, assignedAssistant, and stage fields).
DROP TABLE IF EXISTS "Author";

-- CreateTable Author
CREATE TABLE "Author" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "headAgent" TEXT,
    "headAgentEmail" TEXT,
    "assignedAssistant" TEXT,
    "proposalSentToEditors" TEXT NOT NULL DEFAULT 'not_started',
    "authorMeetings" TEXT NOT NULL DEFAULT 'not_started',
    "bidSent" TEXT NOT NULL DEFAULT 'not_started',
    "dealMemoSent" TEXT NOT NULL DEFAULT 'not_started',
    "dealMemoAccepted" TEXT NOT NULL DEFAULT 'not_started',
    "paymentReceived" TEXT NOT NULL DEFAULT 'not_started',
    "paymentSentToAuthor" TEXT NOT NULL DEFAULT 'not_started',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Author_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Author_createdAt_idx" ON "Author"("createdAt");

-- CreateTable EditorOutreach
CREATE TABLE "EditorOutreach" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "editorFirstName" TEXT NOT NULL,
    "editorLastName" TEXT NOT NULL,
    "editorEmail" TEXT,
    "publishingHouse" TEXT,
    "proposalStage" TEXT NOT NULL DEFAULT 'not_sent',
    "authorMeetingStage" TEXT NOT NULL DEFAULT 'not_sent',
    "bidStage" TEXT NOT NULL DEFAULT 'not_sent',
    "dealMemoStage" TEXT NOT NULL DEFAULT 'not_sent',
    "paymentReceivedStage" TEXT NOT NULL DEFAULT 'not_received',
    "paymentSentToAuthorStage" TEXT NOT NULL DEFAULT 'not_sent',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EditorOutreach_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EditorOutreach_authorId_idx" ON "EditorOutreach"("authorId");

-- AddForeignKey
ALTER TABLE "EditorOutreach" ADD CONSTRAINT "EditorOutreach_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE CASCADE ON UPDATE CASCADE;
