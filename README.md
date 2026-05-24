# Plato

> An Agent for Literary Agents.

An internal tool for literary agents. V1 includes a **Client Library CRM** and a **Payment Email** generator.

## Stack

- Next.js 16 (App Router) + React 19
- TypeScript
- Tailwind CSS v4
- Framer Motion
- Prisma 7 with `@prisma/adapter-neon` (HTTP transport)
- Neon Postgres
- Vercel-deployable

## Features

### Client Library

A polished CRM for tracking authors and their publishing pipelines.

- **Add Author** — centered modal capturing first/last name, book title, genre, author email, head agent, head agent email, and assigned assistant. All fields are required. The modal also hosts the **Upload Editor List** control (per-author; import parsing is stubbed for a future release).
- **Edit / Delete Author** — every author row has Edit (reopens the modal pre-filled) and Delete (guarded by a confirmation dialog; cascade-deletes that author's editors).
- **Author stages** — a row of seven labeled squares (Book Proposal Sent → Payment Sent to Author). Each square shows the stage name plus its current status; click to change it. Updates immediately via optimistic UI. Statuses: Not Started / In Progress / Completed.
- **Editor outreach** — expand any author row to reveal that author's editors as cards. Add, edit, and delete editors (delete is confirmation-guarded). Each editor has six labeled stage squares (Book Proposal → Payment Sent to Author) with stage-specific options and sequential unlock logic (later stages stay locked until the prior stage advances).

### Payment Email

- Select an author from the Client Library roster.
- Select one of that author's editors — the publisher field pre-fills from the editor's publishing house.
- Book title auto-fills from the author; sender name auto-fills from the author's head agent.
- Enter total payment and commission type.
- Calculates 15% commission split live.
- "Generate Email" produces a copy-pasteable payment confirmation email.
- No real email is sent; this tab generates text only.

## Known Limitations

- **File upload parsing**: The "Upload Editor List" control (in the Add Author modal) accepts a file but does not parse or import it. This is intentional — the feature is stubbed for a future release.
- **Email sending**: "Generate Email" produces copy-pasteable text only. No email is actually sent.
- **No authentication**: Treat all deployments as internal-only until auth is added.

## Database schema

```
Author
  id, firstName, lastName, title, genre, email, headAgent, headAgentEmail,
  assignedAssistant  (all required)
  proposalSentToEditors, authorMeetings, bidSent, dealMemoSent, dealMemoAccepted,
  paymentReceived, paymentSentToAuthor  (all String, default "not_started")
  createdAt, updatedAt

EditorOutreach
  id, authorId → Author (cascade delete)
  editorFirstName, editorLastName, editorEmail, publishingHouse  (all required)
  proposalStage, authorMeetingStage, bidStage, dealMemoStage,
  paymentReceivedStage, paymentSentToAuthorStage
  createdAt, updatedAt
```

Stage values and unlock logic live in `src/lib/stages.ts`.

## Run locally

### 1. Install

```bash
npm install
```

### 2. Provision a Neon database

Create a free Postgres database at [console.neon.tech](https://console.neon.tech). Copy the connection string.

### 3. Configure environment

```bash
cp .env.example .env
# paste your Neon URL as DATABASE_URL
```

### 4. Apply the schema

```bash
npm run db:deploy
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push to GitHub and import the repo at [vercel.com/new](https://vercel.com/new).
2. Add `DATABASE_URL` in Vercel → Settings → Environment Variables (apply to all environments).
3. Deploy. The `vercel-build` script runs `prisma generate && prisma migrate deploy && next build` automatically — migrations apply on the first deploy and are idempotent on subsequent ones.

## Migration notes

**V1 → V2 schema change** (migration `20260524000001_client_library`): The original `Author` model (`name`, `title`, `editor`, `publisher`) was replaced with a new model (`firstName`, `lastName`, `headAgentEmail`, `assignedAssistant`, plus pipeline stage fields) and a new `EditorOutreach` model. Since the database was confirmed empty at the time of this change, the migration drops and recreates the `Author` table rather than performing a data-preserving ALTER.

**Required fields + Title/Genre** (migration `20260524000002_required_title_genre`): Adds required `title` and `genre` to `Author`, and makes the remaining `Author` text fields (`email`, `headAgent`, `headAgentEmail`, `assignedAssistant`) and `EditorOutreach` (`editorEmail`, `publishingHouse`) `NOT NULL`. Existing `NULL`s are backfilled to empty strings before the constraints apply, so the migration is safe on a populated database.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the local dev server |
| `npm run build` | `prisma generate && next build` |
| `npm run vercel-build` | `prisma generate && prisma migrate deploy && next build` |
| `npm run start` | Run the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:push` | Sync schema to DB (no migration file) |
| `npm run db:migrate` | Create + apply a dev migration |
| `npm run db:deploy` | Apply checked-in migrations (production) |

## Project layout

```
prisma/
  schema.prisma              Author + EditorOutreach models
  migrations/
    20260524000000_init/       Initial schema
    20260524000001_client_library/  Author model rebuild + EditorOutreach
    20260524000002_required_title_genre/  Title/Genre + required fields

src/
  app/
    actions.ts               Server actions (CRUD authors + editors, stage updates)
    layout.tsx               Fonts + global shell
    globals.css              Editorial theme tokens + utilities
    page.tsx                 Root: initial data fetch → AppShell

  components/
    AppShell.tsx             Client shell: tab state, sidebar state, shared authors
    SidebarNav.tsx           Desktop sidebar + mobile hamburger drawer

    ClientLibrary.tsx        CRM tab: author list + header (controlled by AppShell)
    AddAuthorModal.tsx       Centered modal for adding/editing an author + upload
    AuthorTableRow.tsx       Author row: stages, edit/delete, editor drawer
    AuthorStageTimeline.tsx  7-square author stages
    EditorOutreachTable.tsx  Lazy-loaded editor cards per author (add/edit/delete)
    EditorForm.tsx           Shared add/edit editor form
    EditorStageTimeline.tsx  6-square editor stages with unlock logic
    StagePopover.tsx         Portal-based popover for stage selection
    ConfirmDialog.tsx        Reusable delete-confirmation dialog
    FileUploadControl.tsx    Disabled upload control (placeholder)

    PaymentEmailCard.tsx     Payment email generator
    AuthorPicker.tsx         Custom author listbox
    Field.tsx                Animated input + select primitives
    PlatoMark.tsx            Decorative ornament + hairline rule

  lib/
    stages.ts                Stage enums, labels, colors, unlock logic
    authors.ts               Author Prisma queries
    editorOutreach.ts        EditorOutreach Prisma queries
    db.ts                    Lazy Prisma client (Neon HTTP adapter)
    format.ts                USD formatting + payment email template
```
