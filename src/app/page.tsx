import { Workflow } from "@/components/Workflow";
import { PlatoMark, HairlineRule } from "@/components/PlatoMark";
import { listAuthors, type AuthorRecord } from "@/lib/authors";

export const dynamic = "force-dynamic";

export default async function Page() {
  let initialAuthors: AuthorRecord[] = [];
  let initialError: string | null = null;
  try {
    initialAuthors = await listAuthors();
  } catch (err) {
    console.error("Failed to load authors on server", err);
    initialError =
      "Couldn't reach the database. Check DATABASE_URL and that migrations have run.";
  }

  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex-1 px-6 sm:px-10 lg:px-16 xl:px-24 pt-16 sm:pt-24 pb-24 max-w-[1320px] w-full mx-auto">
        <Masthead />
        <div className="mt-16 sm:mt-20">
          <Workflow
            initialAuthors={initialAuthors}
            initialError={initialError}
          />
        </div>
      </div>
      <Colophon />
    </main>
  );
}

function Masthead() {
  return (
    <header className="relative">
      <div className="flex flex-col items-center text-center">
        <div className="flex items-center gap-4 text-bronze-deep">
          <span
            aria-hidden="true"
            className="block h-px w-12 sm:w-20"
            style={{
              background:
                "linear-gradient(to left, var(--color-bronze), transparent)",
            }}
          />
          <PlatoMark className="w-5 h-5 text-bronze-deep" />
          <span
            aria-hidden="true"
            className="block h-px w-12 sm:w-20"
            style={{
              background:
                "linear-gradient(to right, var(--color-bronze), transparent)",
            }}
          />
        </div>

        <h1
          className="font-serif text-[3.5rem] sm:text-[5rem] leading-none mt-4 tracking-[-0.01em]"
          style={{ color: "var(--color-ink)" }}
        >
          Plato
        </h1>

        <p className="mt-2 font-serif italic text-[1.05rem] sm:text-[1.2rem] text-ink-soft">
          An Agent for Literary Agents
        </p>
      </div>
      <HairlineRule className="mt-10" />
    </header>
  );
}

function Colophon() {
  return (
    <footer className="px-6 sm:px-10 lg:px-16 xl:px-24 pb-10 max-w-[1320px] w-full mx-auto">
      <div className="flex items-center gap-3 text-ink-muted">
        <span
          aria-hidden="true"
          className="block h-px flex-1"
          style={{
            background:
              "linear-gradient(to right, transparent, var(--color-rule))",
          }}
        />
        <span className="smallcaps text-[0.66rem] tracking-[0.22em]">
          Composed in good company
        </span>
        <PlatoMark className="w-3 h-3" />
      </div>
    </footer>
  );
}
