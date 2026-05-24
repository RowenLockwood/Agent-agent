-- Add required Title and Genre to Author, and make the remaining Author and
-- EditorOutreach text fields required (NOT NULL). Existing NULLs are backfilled
-- to empty strings before the constraint is applied so the migration is safe on
-- a populated database.

-- Author: new required fields
ALTER TABLE "Author" ADD COLUMN "title" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Author" ADD COLUMN "genre" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Author" ALTER COLUMN "title" DROP DEFAULT;
ALTER TABLE "Author" ALTER COLUMN "genre" DROP DEFAULT;

-- Author: make previously-optional fields required
UPDATE "Author" SET "email" = '' WHERE "email" IS NULL;
UPDATE "Author" SET "headAgent" = '' WHERE "headAgent" IS NULL;
UPDATE "Author" SET "headAgentEmail" = '' WHERE "headAgentEmail" IS NULL;
UPDATE "Author" SET "assignedAssistant" = '' WHERE "assignedAssistant" IS NULL;

ALTER TABLE "Author" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "Author" ALTER COLUMN "headAgent" SET NOT NULL;
ALTER TABLE "Author" ALTER COLUMN "headAgentEmail" SET NOT NULL;
ALTER TABLE "Author" ALTER COLUMN "assignedAssistant" SET NOT NULL;

-- EditorOutreach: make previously-optional fields required
UPDATE "EditorOutreach" SET "editorEmail" = '' WHERE "editorEmail" IS NULL;
UPDATE "EditorOutreach" SET "publishingHouse" = '' WHERE "publishingHouse" IS NULL;

ALTER TABLE "EditorOutreach" ALTER COLUMN "editorEmail" SET NOT NULL;
ALTER TABLE "EditorOutreach" ALTER COLUMN "publishingHouse" SET NOT NULL;
