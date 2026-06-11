-- Payment Email templates: the configurable template layer for the Payment
-- Email tab. Four new tables, no changes to existing data.
--
--   PaymentEmailTemplate        — saved templates. The body is a tokenized JSON
--                                 segment list plus a plain-text fallback. The
--                                 Plato system default is seeded lazily by the
--                                 app at a fixed id and protected in code; user
--                                 versions link back via parentTemplateId
--                                 (SET NULL so deleting a parent keeps history).
--   PaymentEmailCustomField     — agency-created input fields, per template.
--   PaymentEmailCalculatedField — safe structured formulas (JSON expression
--                                 tree, never executable code), per template.
--   PaymentEmailSummaryField    — the single source of truth for the summary
--                                 row above "Generate Email" (≤ 4, ordered).

-- CreateTable
CREATE TABLE "PaymentEmailTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "subjectLine" TEXT,
    "tokenizedBody" TEXT NOT NULL,
    "plainTextBodyFallback" TEXT NOT NULL,
    "isSystemDefault" BOOLEAN NOT NULL DEFAULT false,
    "isAgencyDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "parentTemplateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentEmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEmailCustomField" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "placeholder" TEXT,
    "defaultValue" TEXT,
    "dropdownOptions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentEmailCustomField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEmailCalculatedField" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "outputType" TEXT NOT NULL,
    "expressionTree" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentEmailCalculatedField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEmailSummaryField" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "summaryLabel" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentEmailSummaryField_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentEmailTemplate_parentTemplateId_idx" ON "PaymentEmailTemplate"("parentTemplateId");

-- CreateIndex
CREATE INDEX "PaymentEmailTemplate_createdAt_idx" ON "PaymentEmailTemplate"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEmailCustomField_templateId_fieldKey_key" ON "PaymentEmailCustomField"("templateId", "fieldKey");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEmailCalculatedField_templateId_fieldKey_key" ON "PaymentEmailCalculatedField"("templateId", "fieldKey");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEmailSummaryField_templateId_fieldKey_key" ON "PaymentEmailSummaryField"("templateId", "fieldKey");

-- AddForeignKey
ALTER TABLE "PaymentEmailTemplate" ADD CONSTRAINT "PaymentEmailTemplate_parentTemplateId_fkey" FOREIGN KEY ("parentTemplateId") REFERENCES "PaymentEmailTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEmailCustomField" ADD CONSTRAINT "PaymentEmailCustomField_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PaymentEmailTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEmailCalculatedField" ADD CONSTRAINT "PaymentEmailCalculatedField_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PaymentEmailTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEmailSummaryField" ADD CONSTRAINT "PaymentEmailSummaryField_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PaymentEmailTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
