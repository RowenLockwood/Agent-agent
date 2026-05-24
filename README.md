# Plato

> An Agent for Literary Agents.

A small internal tool for literary agents. Version 1 lets you save authors and
compose copy-pasteable payment-confirmation emails with the agency's 15%
commission split calculated for you.

## Stack

- Next.js (App Router) + React 19
- TypeScript
- Tailwind CSS v4
- Framer Motion
- Prisma 7 with the Neon driver adapter (`@prisma/adapter-neon`)
- Neon Postgres
- Deployable on Vercel

## Run locally

### 1. Install

```bash
npm install
```

### 2. Provision a Neon database

Create a free Postgres database at [console.neon.tech](https://console.neon.tech)
and copy the **pooled** connection string. It will look like:

```
postgresql://USER:PASSWORD@ep-XXX-pooler.REGION.aws.neon.tech/neondb?sslmode=require
```

### 3. Configure environment

Copy the example and paste in your connection string:

```bash
cp .env.example .env
```

```dotenv
DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require"
```

### 4. Apply the schema

The repo includes a checked-in initial migration. Apply it once:

```bash
npm run db:deploy
```

For day-to-day schema changes, `npm run db:migrate` will generate and apply new
migrations against your dev database. Or, for quick experiments, you can use
`npm run db:push` to sync the schema without writing a migration file.

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

You can ship this without ever running anything on your machine.

1. **Create a Neon database** at [console.neon.tech](https://console.neon.tech)
   (the free tier is plenty). Copy the connection string — the unpooled one
   is recommended for migrations.
2. **Push this repo to GitHub** (or merge the feature branch into `main`).
3. **Import the repo into Vercel**: [vercel.com/new](https://vercel.com/new) →
   pick your GitHub repo → keep all the defaults.
4. **Add the environment variable**: in Vercel's project settings → Environment
   Variables, add `DATABASE_URL` with your Neon connection string. Apply it
   to Production, Preview, and Development.
5. **Click Deploy.** Vercel runs the `vercel-build` script, which:
   - generates the Prisma client (`prisma generate`)
   - applies any pending migrations (`prisma migrate deploy`)
   - builds the Next.js app (`next build`)

   The migration is idempotent — every deploy re-checks `_prisma_migrations`
   and applies anything new. The first deploy creates the `Author` table.

The Prisma client uses `@prisma/adapter-neon` over HTTP, so it works
well in Vercel's serverless functions with no extra runtime configuration.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the local dev server |
| `npm run build` | `prisma generate && next build` |
| `npm run start` | Run the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:push` | Sync schema to the database (no migration file) |
| `npm run db:migrate` | Create + apply a dev migration |
| `npm run db:deploy` | Apply checked-in migrations (production) |

## Project layout

```
prisma/
  schema.prisma              Author model
  migrations/                Checked-in SQL migrations
src/
  app/
    actions.ts               Server actions (create/list authors)
    layout.tsx               Fonts + global shell
    globals.css              Editorial theme tokens
    page.tsx                 Homepage — initial author fetch + Workflow
  components/
    AddAuthorCard.tsx        Card I — save a new author
    AuthorPicker.tsx         Custom listbox for the author dropdown
    Field.tsx                Animated input + select primitives
    PaymentEmailCard.tsx     Card II — compose the payment email (+ email reveal)
    PlatoMark.tsx            Decorative ornament + hairline rule
    Workflow.tsx             Holds shared author state between the cards
  lib/
    authors.ts               Small data layer over Prisma
    db.ts                    Lazy Prisma client (Neon HTTP adapter)
    format.ts                USD formatting + email template + split math
```

## Notes

- This version does **not** send real email — "Generate Email" composes a
  body and shows a copy-pasteable preview. Wiring a transactional mail
  provider is intentionally left to a later iteration.
- There is no authentication yet. Treat the deployment as an internal tool.
- Commission rate is fixed at 15%. Edit `COMMISSION_RATE` in
  `src/lib/format.ts` if that changes.
