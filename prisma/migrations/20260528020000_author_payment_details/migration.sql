-- Create the AuthorPaymentDetails table — one row per author, holding the
-- contract progression (seven stages), commission terms, and royalty schedule
-- shown in the Client Library's Payment Details dropdown. New rows are
-- created lazily on first write (upsert by authorId), so no backfill is run
-- here for existing authors; the UI defaults to "not_started" stages and
-- empty contract fields until the user touches them.

CREATE TABLE "AuthorPaymentDetails" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,

    "contractSentToEditorStage"       TEXT NOT NULL DEFAULT 'not_started',
    "backAndForthWithEditorStage"     TEXT NOT NULL DEFAULT 'not_started',
    "contractSignedByAuthorStage"     TEXT NOT NULL DEFAULT 'not_started',
    "contractSignedByEditorStage"     TEXT NOT NULL DEFAULT 'not_started',
    "contractSignedByAllPartiesStage" TEXT NOT NULL DEFAULT 'not_started',
    "paymentReceivedFromEditorStage"  TEXT NOT NULL DEFAULT 'not_started',
    "paymentSentToAuthorStage"        TEXT NOT NULL DEFAULT 'not_started',

    "commissionAmount"           DOUBLE PRECISION,
    "commissionPercentForAgency" DOUBLE PRECISION,

    "firstRoyaltyStatementDate" TIMESTAMP(3),
    "renewalIntervalNumber"     INTEGER,
    "renewalIntervalUnit"       TEXT,
    "lastSentToAuthorDate"      TIMESTAMP(3),
    "nextSendToAuthorDate"      TIMESTAMP(3),

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthorPaymentDetails_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuthorPaymentDetails_authorId_key"
    ON "AuthorPaymentDetails"("authorId");

ALTER TABLE "AuthorPaymentDetails"
    ADD CONSTRAINT "AuthorPaymentDetails_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "Author"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
