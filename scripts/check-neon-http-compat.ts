// Verification harness for Neon HTTP-mode compatibility of the payment email
// DB layer.
//
// The production adapter (PrismaNeonHttp) cannot run transactions, and
// Prisma's query compiler opens IMPLICIT transactions for some operations —
// notably `createMany` and `updateMany` (even single-row) — which then fail
// with "Transactions are not supported in HTTP mode". This script runs the
// REAL src/lib/paymentEmail/db.ts code against a local Postgres through a
// shim adapter that rejects startTransaction() exactly like the HTTP adapter
// (and, like it, does not advertise relation-join support). Any operation
// that would break in production breaks here.
//
// Setup (local Postgres on :5433):
//   initdb + pg_ctl start, createdb plato, then:
//   DATABASE_URL=postgresql://plato@127.0.0.1:5433/plato npx prisma db push
//   npm i --no-save @prisma/adapter-pg pg tsx && npx tsx scripts/check-neon-http-compat.ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const LOCAL_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://plato@127.0.0.1:5433/plato";
// This harness WIPES the payment email tables. Refuse anything non-local.
if (!/127\.0\.0\.1|localhost/.test(LOCAL_URL)) {
  console.error("check-neon-http-compat only runs against a local database.");
  process.exit(1);
}

type AnyAdapter = {
  [k: string]: unknown;
};

class HttpModeShimFactory {
  provider = "postgres" as const;
  adapterName = "shim-neon-http";
  private inner = new PrismaPg({ connectionString: LOCAL_URL });

  async connect() {
    const adapter = (await this.inner.connect()) as unknown as AnyAdapter;
    return new Proxy(adapter, {
      get(target, prop) {
        if (prop === "startTransaction") {
          return () =>
            Promise.reject(
              new Error("Transactions are not supported in HTTP mode"),
            );
        }
        if (prop === "getConnectionInfo") {
          // PrismaNeonHttpAdapter does not implement getConnectionInfo, so
          // relation joins are not advertised. Mirror that.
          return undefined;
        }
        const v = Reflect.get(target, prop, target);
        return typeof v === "function" ? (v as Function).bind(target) : v;
      },
    });
  }
}

let pass = 0;
let fail = 0;
async function step<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    const out = await fn();
    pass++;
    console.log(`PASS  ${label}`);
    return out;
  } catch (err) {
    fail++;
    console.log(`FAIL  ${label}`);
    console.log(`      ${(err as Error).message?.slice(0, 200)}`);
    return null;
  }
}

async function main() {
  const client = new PrismaClient({
    adapter: new HttpModeShimFactory() as never,
  });
  // src/lib/db.ts picks up a pre-set global instead of building the Neon
  // client, so the real db-layer code runs through our shim.
  (globalThis as Record<string, unknown>).prisma = client;

  const db = await import("../src/lib/paymentEmail/db");
  const { SYSTEM_DEFAULT_TEMPLATE_ID } = await import(
    "../src/lib/paymentEmail/defaultTemplate"
  );

  // Wipe payment email tables for a clean run.
  await client.paymentEmailSummaryField.deleteMany({});
  await client.paymentEmailCalculatedField.deleteMany({});
  await client.paymentEmailCustomField.deleteMany({});
  await client.paymentEmailTemplate.deleteMany({});

  const list1 = await step("listTemplates (cold: seeds Plato Default)", () =>
    db.listTemplates(),
  );
  if (list1) {
    const def = list1.find((t) => t.id === SYSTEM_DEFAULT_TEMPLATE_ID);
    console.log(
      `      seeded default present=${!!def} calcs=${def?.calculatedFields.length} summaries=${def?.summaryFields.length} bodySegs=${def?.body.length}`,
    );
  }

  await step("listTemplates (warm: pure read)", () => db.listTemplates());
  await step("getEffectiveDefaultTemplateId", () =>
    db.getEffectiveDefaultTemplateId(),
  );
  await step("getTemplate(system default)", () =>
    db.getTemplate(SYSTEM_DEFAULT_TEMPLATE_ID),
  );

  const draft = {
    name: "Repro Template",
    description: "made by repro harness",
    subjectLine: "Payment received for {{bookTitle}}",
    body: [
      { t: "text" as const, v: "Dear " },
      { t: "field" as const, k: "authorFullName" },
      { t: "text" as const, v: ",\nyour payment is in." },
    ],
    customFields: [
      {
        fieldKey: "custom_note",
        label: "Note",
        fieldType: "short_text" as const,
        isRequired: false,
        placeholder: "optional note",
        defaultValue: null,
        dropdownOptions: [],
      },
      {
        fieldKey: "custom_channel",
        label: "Channel",
        fieldType: "dropdown" as const,
        isRequired: true,
        placeholder: null,
        defaultValue: "Wire",
        dropdownOptions: ["Wire", "Check"],
      },
    ],
    calculatedFields: [],
    summaryFields: [
      { fieldKey: "custom_note", summaryLabel: "Note" },
      { fieldKey: "authorFullName", summaryLabel: "Author" },
    ],
  };

  const created = await step("createTemplate (customs + summaries)", () =>
    db.createTemplate(draft),
  );

  if (created) {
    console.log(
      `      created customs=${created.customFields.length} summaries=${created.summaryFields.length}`,
    );
    await step("getTemplate(created)", () => db.getTemplate(created.id));
    await step("updateTemplate (replace children)", () =>
      db.updateTemplate(created.id, {
        ...draft,
        name: "Repro Template v2",
        summaryFields: [{ fieldKey: "custom_channel", summaryLabel: "Channel" }],
      }),
    );
    await step("renameTemplate", () =>
      db.renameTemplate(created.id, "Repro Renamed"),
    );
    await step("setAgencyDefault(created)", () =>
      db.setAgencyDefault(created.id),
    );
    const eff = await step("getEffectiveDefaultTemplateId → created", () =>
      db.getEffectiveDefaultTemplateId(),
    );
    if (eff && eff !== created.id) {
      fail++;
      console.log(`FAIL  effective default mismatch: ${eff}`);
    }
    await step("setAgencyDefault(system default)", () =>
      db.setAgencyDefault(SYSTEM_DEFAULT_TEMPLATE_ID),
    );
    await step("deleteTemplate(created)", () => db.deleteTemplate(created.id));
  }

  // duplicate-style create with a parent lineage
  const dup = await step("createTemplate (with parentTemplateId)", () =>
    db.createTemplate({
      ...draft,
      name: "Repro Duplicate",
      parentTemplateId: SYSTEM_DEFAULT_TEMPLATE_ID,
    }),
  );
  if (dup) {
    console.log(`      versionNumber=${dup.versionNumber}`);
    await step("deleteTemplate(duplicate)", async () => {
      await db.setAgencyDefault(SYSTEM_DEFAULT_TEMPLATE_ID);
      await db.deleteTemplate(dup.id);
    });
  }

  // Simulate the partial-seed state a pre-fix production deploy leaves
  // behind (parent row present, children missing) and verify reads heal it.
  await client.paymentEmailCalculatedField.deleteMany({
    where: { templateId: SYSTEM_DEFAULT_TEMPLATE_ID },
  });
  await client.paymentEmailSummaryField.deleteMany({
    where: { templateId: SYSTEM_DEFAULT_TEMPLATE_ID },
  });
  const healed = await step("listTemplates heals partial default", () =>
    db.listTemplates(),
  );
  if (healed) {
    const def = healed.find((t) => t.id === SYSTEM_DEFAULT_TEMPLATE_ID);
    const ok =
      (def?.calculatedFields.length ?? 0) > 0 &&
      (def?.summaryFields.length ?? 0) > 0;
    if (ok) {
      pass++;
      console.log(
        `PASS  default healed (calcs=${def?.calculatedFields.length}, summaries=${def?.summaryFields.length})`,
      );
    } else {
      fail++;
      console.log("FAIL  default children were not rebuilt");
    }
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  await client.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("harness crashed:", e);
  process.exit(1);
});
