-- Add the "Author Onboarded" author-level stage as the new first stage.
-- The column is NOT NULL with a default of 'not_started', so existing authors
-- are preserved and automatically backfilled to the default. No existing stage
-- fields are dropped or renamed.

ALTER TABLE "Author" ADD COLUMN "authorOnboarded" TEXT NOT NULL DEFAULT 'not_started';
