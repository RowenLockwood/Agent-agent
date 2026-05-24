"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { AuthorRecord } from "@/lib/authors";
import { listAuthorsAction } from "@/app/actions";
import { AddAuthorCard } from "./AddAuthorCard";
import { PaymentEmailCard } from "./PaymentEmailCard";

type Props = {
  initialAuthors: AuthorRecord[];
  initialError: string | null;
};

export function Workflow({ initialAuthors, initialError }: Props) {
  const [authors, setAuthors] = useState<AuthorRecord[]>(initialAuthors);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [authorsError, setAuthorsError] = useState<string | null>(initialError);

  function handleSaved(author: AuthorRecord) {
    setAuthors((prev) => [author, ...prev.filter((a) => a.id !== author.id)]);
    setSelectedId(author.id);
    setHighlightId(author.id);
    setAuthorsError(null);
    // Clear the new-author highlight after the pulse animation finishes.
    setTimeout(() => setHighlightId(null), 2200);
  }

  // If the initial fetch failed, retry once on mount.
  useEffect(() => {
    if (initialAuthors.length > 0 || !initialError) return;
    let cancelled = false;
    (async () => {
      const result = await listAuthorsAction();
      if (cancelled) return;
      if (result.ok) {
        setAuthors(result.authors);
        setAuthorsError(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialAuthors.length, initialError]);

  const container = {
    hidden: {},
    show: {
      transition: { staggerChildren: 0.08, delayChildren: 0.05 },
    },
  } as const;
  const item = {
    hidden: { opacity: 0, y: 14 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.2, 0.6, 0.2, 1] as const },
    },
  } as const;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-10 lg:gap-0"
    >
      <motion.section
        variants={item}
        aria-labelledby="card-one-heading"
        className="lg:pr-12 xl:pr-16"
      >
        <CardHeader id="card-one-heading" title="Add new author" />
        <AddAuthorCard onSaved={handleSaved} />
      </motion.section>

      <motion.div
        variants={item}
        aria-hidden="true"
        className="hidden lg:flex justify-center"
      >
        <div
          className="w-px"
          style={{
            background:
              "linear-gradient(to bottom, transparent, var(--color-rule) 12%, var(--color-rule) 88%, transparent)",
          }}
        />
      </motion.div>

      <motion.section
        variants={item}
        aria-labelledby="card-two-heading"
        className="lg:pl-12 xl:pl-16"
      >
        <CardHeader id="card-two-heading" title="Payment email" />
        <PaymentEmailCard
          authors={authors}
          selectedId={selectedId}
          onSelect={setSelectedId}
          highlightId={highlightId}
          authorsError={authorsError}
        />
      </motion.section>
    </motion.div>
  );
}

function CardHeader({ id, title }: { id: string; title: string }) {
  return (
    <header className="mb-8 flex items-baseline gap-5">
      <h2
        id={id}
        className="font-serif text-[2rem] sm:text-[2.25rem] leading-none tracking-[-0.005em] whitespace-nowrap"
        style={{ color: "var(--color-ink)" }}
      >
        {title}
      </h2>
      <span
        aria-hidden="true"
        className="block h-px flex-1 translate-y-[-0.35rem]"
        style={{
          background:
            "linear-gradient(to right, var(--color-rule), transparent 85%)",
        }}
      />
    </header>
  );
}
