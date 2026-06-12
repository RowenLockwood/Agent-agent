-- Create the AppSettings table — a single-row store for app-wide values
-- (currently just the agency name shown in the Client Library header and
-- auto-populated into the Author Agreement Email tab). The one row uses
-- id = 'singleton'; writes go through prisma.appSettings.upsert.

CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL,
    "agencyName" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);
