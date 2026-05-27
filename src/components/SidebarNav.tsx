"use client";

import { motion, AnimatePresence } from "framer-motion";
import { PlatoMark } from "./PlatoMark";

type Tab = 0 | 1 | 2;

type Props = {
  activeTab: Tab;
  onTabChange: (t: Tab) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
};

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: 0,
    label: "Client Library",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="1" y="2" width="6" height="12" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
        <rect x="9" y="2" width="6" height="12" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
        <line x1="3" y1="5.5" x2="5" y2="5.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <line x1="3" y1="7.5" x2="5" y2="7.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <line x1="11" y1="5.5" x2="13" y2="5.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <line x1="11" y1="7.5" x2="13" y2="7.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 1,
    label: "Payment Email",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="1" y="3" width="14" height="10" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M1.5 3.5 L8 9 L14.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 2,
    label: "Author Agreement Email",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="3" y="1.5" width="10" height="13" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
        <line x1="5.5" y1="5" x2="10.5" y2="5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <line x1="5.5" y1="7" x2="10.5" y2="7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <path d="M5 11.2 c1 -1.5 2 -1.5 3 -0.2 c0.5 0.7 1.3 0.4 2 -0.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

function NavContent({
  activeTab,
  onTabChange,
  onClose,
}: {
  activeTab: Tab;
  onTabChange: (t: Tab) => void;
  onClose?: () => void;
}) {
  return (
    <nav className="flex flex-col h-full" aria-label="Primary navigation">
      {/* Wordmark */}
      <div className="px-6 pt-8 pb-6 flex items-center gap-3">
        <PlatoMark className="w-4 h-4 flex-shrink-0" style={{ color: "var(--color-bronze)" }} />
        <div>
          <div
            className="font-serif text-[1.45rem] leading-none tracking-[-0.01em]"
            style={{ color: "var(--color-sidebar-text)" }}
          >
            Plato
          </div>
          <div
            className="font-serif italic text-[0.68rem] leading-tight mt-0.5"
            style={{ color: "var(--color-sidebar-muted)" }}
          >
            An Agent for Literary Agents
          </div>
        </div>
      </div>

      {/* Hairline */}
      <div
        className="mx-6 mb-5"
        style={{ height: "1px", background: "var(--color-sidebar-rule)" }}
      />

      {/* Nav items */}
      <ul className="flex flex-col gap-0.5 px-3 flex-1" role="list">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <li key={tab.id} role="none">
              <button
                type="button"
                onClick={() => {
                  onTabChange(tab.id);
                  onClose?.();
                }}
                aria-current={isActive ? "page" : undefined}
                className="relative w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-left transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-bronze"
                style={{
                  color: isActive ? "var(--color-sidebar-text)" : "var(--color-sidebar-muted)",
                  backgroundColor: isActive ? "var(--color-sidebar-active)" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      "var(--color-sidebar-hover)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                }}
              >
                {isActive && (
                  <motion.span
                    layoutId="sidebar-indicator"
                    className="absolute left-0 top-[20%] bottom-[20%] w-[2px] rounded-full"
                    style={{ background: "var(--color-bronze)" }}
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  />
                )}
                <span
                  className="flex-shrink-0 transition-colors"
                  style={{ color: isActive ? "var(--color-bronze)" : "var(--color-sidebar-muted)" }}
                >
                  {tab.icon}
                </span>
                <span className="text-[0.85rem] font-sans font-medium">{tab.label}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Version tag */}
      <div className="px-6 pb-6 pt-4">
        <div
          className="smallcaps text-[0.6rem]"
          style={{ color: "var(--color-sidebar-muted)" }}
        >
          v1
        </div>
      </div>
    </nav>
  );
}

export function SidebarNav({ activeTab, onTabChange, mobileOpen, onMobileClose }: Props) {
  return (
    <>
      {/* Desktop sidebar — always visible ≥ lg */}
      <aside
        className="hidden lg:flex flex-col w-[220px] flex-shrink-0 h-full"
        style={{ background: "var(--color-sidebar)" }}
      >
        <NavContent activeTab={activeTab} onTabChange={onTabChange} />
      </aside>

      {/* Mobile: hamburger button */}
      <button
        type="button"
        onClick={() => (mobileOpen ? onMobileClose() : undefined)}
        className="lg:hidden fixed top-4 left-4 z-50 w-9 h-9 flex items-center justify-center focus:outline-none"
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
        style={{ color: mobileOpen ? "var(--color-sidebar-text)" : "var(--color-ink-muted)" }}
      >
        {/* Hamburger icon — managed by AppShell toggle */}
      </button>

      {/* Mobile overlay backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden fixed inset-0 z-40"
            style={{ background: "rgba(26,23,20,0.6)" }}
            onClick={onMobileClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Mobile slide-out drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            key="drawer"
            initial={{ x: -240 }}
            animate={{ x: 0 }}
            exit={{ x: -240 }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="lg:hidden fixed left-0 top-0 bottom-0 w-[240px] z-50 flex flex-col"
            style={{ background: "var(--color-sidebar)" }}
            aria-label="Navigation drawer"
          >
            <NavContent
              activeTab={activeTab}
              onTabChange={onTabChange}
              onClose={onMobileClose}
            />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
