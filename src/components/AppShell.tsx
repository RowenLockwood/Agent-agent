"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { listAuthorsAction } from "@/app/actions";
import type { AuthorRecord } from "@/lib/authors";
import { SidebarNav } from "./SidebarNav";
import { ClientLibrary } from "./ClientLibrary";
import { PaymentEmailCard } from "./PaymentEmailCard";
import { AuthorAgreementEmail } from "./AuthorAgreementEmail";

type Tab = 0 | 1 | 2;

type Props = {
  initialAuthors: AuthorRecord[];
  initialError: string | null;
};

export function AppShell({ initialAuthors, initialError }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>(0);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [authors, setAuthors] = useState<AuthorRecord[]>(initialAuthors);
  const [authorsError, setAuthorsError] = useState<string | null>(initialError);

  // Retry once on mount if initial fetch failed
  useEffect(() => {
    if (initialAuthors.length > 0 || !initialError) return;
    let cancelled = false;
    (async () => {
      const r = await listAuthorsAction();
      if (cancelled) return;
      if (r.ok) { setAuthors(r.authors); setAuthorsError(null); }
    })();
    return () => { cancelled = true; };
  }, [initialAuthors.length, initialError]);

  function handleAuthorAdded(author: AuthorRecord) {
    setAuthors((prev) => [author, ...prev.filter((a) => a.id !== author.id)]);
    setAuthorsError(null);
  }

  function handleAuthorUpdated(author: AuthorRecord) {
    setAuthors((prev) => prev.map((a) => (a.id === author.id ? author : a)));
  }

  function handleAuthorDeleted(id: string) {
    setAuthors((prev) => prev.filter((a) => a.id !== id));
  }

  const TAB_NAMES: Record<Tab, string> = {
    0: "Client Library",
    1: "Payment Email",
    2: "Author Agreement Email",
  };

  return (
    <div className="flex h-full">
      <SidebarNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* Content area */}
      <div
        className="flex-1 flex flex-col min-w-0 h-full overflow-auto"
        style={{ background: "var(--color-paper)" }}
      >
        {/* Mobile top bar */}
        <div
          className="lg:hidden flex items-center gap-3 px-4 py-3 border-b sticky top-0 z-30"
          style={{
            borderColor: "var(--color-rule-soft)",
            background: "var(--color-paper)",
          }}
        >
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setMobileSidebarOpen(true)}
            className="w-8 h-8 flex flex-col justify-center gap-[5px] focus:outline-none"
            style={{ color: "var(--color-ink-muted)" }}
          >
            <span className="block h-px w-5" style={{ background: "currentColor" }} />
            <span className="block h-px w-5" style={{ background: "currentColor" }} />
            <span className="block h-px w-3" style={{ background: "currentColor" }} />
          </button>
          <span
            className="font-serif text-[1.05rem]"
            style={{ color: "var(--color-ink)" }}
          >
            {TAB_NAMES[activeTab]}
          </span>
        </div>

        {/* Tab panels */}
        <div className="flex-1 min-h-0 relative">
          <AnimatePresence mode="wait" initial={false}>
            {activeTab === 0 ? (
              <motion.div
                key="client-library"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: [0.2, 0.6, 0.2, 1] }}
                className="h-full"
              >
                <ClientLibrary
                  authors={authors}
                  authorsError={authorsError}
                  onAdded={handleAuthorAdded}
                  onUpdated={handleAuthorUpdated}
                  onDeleted={handleAuthorDeleted}
                />
              </motion.div>
            ) : activeTab === 1 ? (
              <motion.div
                key="payment-email"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: [0.2, 0.6, 0.2, 1] }}
                className="h-full overflow-auto"
              >
                <PaymentEmailWrapper authors={authors} />
              </motion.div>
            ) : (
              <motion.div
                key="author-agreement-email"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: [0.2, 0.6, 0.2, 1] }}
                className="h-full overflow-auto"
              >
                <AuthorAgreementWrapper
                  authors={authors}
                  authorsError={authorsError}
                  onAuthorUpdated={handleAuthorUpdated}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// Wrapper so PaymentEmailCard has its own selection state per session
function PaymentEmailWrapper({ authors }: { authors: AuthorRecord[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="px-6 sm:px-10 lg:px-14 py-10 max-w-[860px]">
      <header className="mb-10">
        <h1
          className="font-serif text-[2rem] sm:text-[2.5rem] leading-none"
          style={{ color: "var(--color-ink)" }}
        >
          Payment Email
        </h1>
        <p
          className="mt-2 font-serif italic text-[1.05rem]"
          style={{ color: "var(--color-ink-muted)" }}
        >
          Compose a payment confirmation for any author.
        </p>
        <div
          className="mt-6"
          style={{
            height: "1px",
            background:
              "linear-gradient(to right, var(--color-rule), transparent 75%)",
          }}
        />
      </header>
      <PaymentEmailCard
        authors={authors}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
    </div>
  );
}

function AuthorAgreementWrapper({
  authors,
  authorsError,
  onAuthorUpdated,
}: {
  authors: AuthorRecord[];
  authorsError: string | null;
  onAuthorUpdated: (author: AuthorRecord) => void;
}) {
  return (
    <div className="px-6 sm:px-10 lg:px-14 py-10 max-w-[860px]">
      <header className="mb-10">
        <h1
          className="font-serif text-[2rem] sm:text-[2.5rem] leading-none"
          style={{ color: "var(--color-ink)" }}
        >
          Author Agreement Email
        </h1>
        <p
          className="mt-2 font-serif italic text-[1.05rem]"
          style={{ color: "var(--color-ink-muted)" }}
        >
          Invite an author to review and sign your agency agreement.
        </p>
        <div
          className="mt-6"
          style={{
            height: "1px",
            background:
              "linear-gradient(to right, var(--color-rule), transparent 75%)",
          }}
        />
      </header>
      <AuthorAgreementEmail
        authors={authors}
        authorsError={authorsError}
        onAuthorUpdated={onAuthorUpdated}
      />
    </div>
  );
}
