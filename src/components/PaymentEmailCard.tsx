"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { listEditorOutreachAction } from "@/app/actions";
import type { AuthorRecord } from "@/lib/authors";
import type { EditorOutreachRecord } from "@/lib/editorOutreach";
import {
  buildPaymentEmail,
  calculateSplit,
  COMMISSION_TYPES,
  formatRate,
  formatUSD,
  type CommissionType,
} from "@/lib/format";
import { AuthorPicker } from "./AuthorPicker";
import { Field, SelectField } from "./Field";

type Props = {
  authors: AuthorRecord[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  highlightId?: string | null;
  authorsError?: string | null;
};

type FormState = {
  totalPayment: string;
  commissionRate: string;
  commissionType: CommissionType;
  editorName: string;
  title: string;
  publisher: string;
  senderName: string;
};

const INITIAL: FormState = {
  totalPayment: "",
  commissionRate: "15",
  commissionType: "advance",
  editorName: "",
  title: "",
  publisher: "",
  senderName: "",
};

export function PaymentEmailCard({
  authors,
  selectedId,
  onSelect,
  highlightId,
  authorsError,
}: Props) {
  const selected = useMemo(
    () => authors.find((a) => a.id === selectedId) ?? null,
    [authors, selectedId],
  );

  const [form, setForm] = useState<FormState>(INITIAL);
  const [email, setEmail] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const emailRef = useRef<HTMLTextAreaElement>(null);

  const [editors, setEditors] = useState<EditorOutreachRecord[]>([]);
  const [editorsLoading, setEditorsLoading] = useState(false);
  const [selectedEditorId, setSelectedEditorId] = useState<string>("");

  // When the author changes: auto-fill title + sender, and load that author's
  // editors so the publisher can be pre-filled from a chosen editor.
  useEffect(() => {
    setEmail(null);
    setSelectedEditorId("");
    setEditors([]);
    if (!selected) return;

    setForm((f) => ({
      ...f,
      editorName: "",
      title: selected.title,
      publisher: "",
      senderName: selected.headAgent,
    }));

    let cancelled = false;
    setEditorsLoading(true);
    (async () => {
      const r = await listEditorOutreachAction(selected.id);
      if (cancelled) return;
      setEditorsLoading(false);
      if (r.ok) setEditors(r.editors);
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  function onEditorChange(id: string) {
    setSelectedEditorId(id);
    const editor = editors.find((e) => e.id === id);
    setForm((f) => ({
      ...f,
      editorName: editor
        ? `${editor.editorFirstName} ${editor.editorLastName}`.trim()
        : "",
      publisher: editor ? editor.publishingHouse : "",
    }));
    setEmail(null);
    if (error) setError(null);
  }

  function update<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
    setEmail(null);
    if (error) setError(null);
  }

  const totalNumber = useMemo(() => {
    if (!form.totalPayment) return NaN;
    const cleaned = form.totalPayment.replace(/[^0-9.]/g, "");
    return Number.parseFloat(cleaned);
  }, [form.totalPayment]);
  const hasValidTotal = Number.isFinite(totalNumber) && totalNumber > 0;

  const rateNumber = useMemo(() => {
    if (!form.commissionRate) return 15;
    const cleaned = form.commissionRate.replace(/[^0-9.]/g, "");
    const n = Number.parseFloat(cleaned);
    return Number.isFinite(n) && n > 0 && n <= 100 ? n : 15;
  }, [form.commissionRate]);

  const split = useMemo(
    () => calculateSplit(hasValidTotal ? totalNumber : 0, rateNumber),
    [hasValidTotal, totalNumber, rateNumber],
  );

  function onGenerate() {
    setError(null);
    if (!selected) {
      setError("Choose an author first.");
      return;
    }
    if (!hasValidTotal) {
      setError("Enter a total payment amount greater than zero.");
      return;
    }
    startTransition(() => {
      const body = buildPaymentEmail({
        authorName: `${selected.firstName} ${selected.lastName}`.trim(),
        totalPayment: totalNumber,
        commissionRate: rateNumber,
        commissionType: form.commissionType,
        title: form.title,
        publisher: form.publisher,
        senderName: form.senderName,
      });
      setEmail(body);
      setCopied(false);
    });
  }

  async function onCopy() {
    if (!email) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(email);
      } else if (emailRef.current) {
        emailRef.current.select();
        document.execCommand("copy");
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error(err);
      setError("Could not copy. Select the text and copy it manually.");
    }
  }

  const canGenerate = !!selected && hasValidTotal && !pending;

  return (
    <div className="flex flex-col gap-5">
      <AuthorPicker
        label="Author"
        authors={authors}
        value={selectedId}
        onChange={onSelect}
        highlightId={highlightId}
        required
      />

      {selected && (editorsLoading || editors.length > 0) ? (
        <SelectField
          label="Editor"
          hint={
            editorsLoading
              ? "Loading editors…"
              : "Pick a saved editor to pre-fill the publisher below."
          }
          value={selectedEditorId}
          onChange={(e) => onEditorChange(e.currentTarget.value)}
          disabled={editorsLoading}
        >
          <option value="">
            {editorsLoading ? "Loading…" : "Select an editor…"}
          </option>
          {editors.map((ed) => (
            <option key={ed.id} value={ed.id}>
              {ed.editorFirstName} {ed.editorLastName}
            </option>
          ))}
        </SelectField>
      ) : (
        <Field
          label="Editor"
          hint={
            selected
              ? "No saved editors for this author — type the editor's name."
              : "Type the editor's name, or select an author to pick a saved editor."
          }
          autoComplete="off"
          value={form.editorName}
          onChange={(e) => update("editorName", e.currentTarget.value)}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
        <Field
          label="Total payment"
          inputMode="decimal"
          autoComplete="off"
          placeholder="10000"
          value={form.totalPayment}
          onChange={(e) => update("totalPayment", e.currentTarget.value)}
        />
        <Field
          label="Commission %"
          inputMode="decimal"
          autoComplete="off"
          placeholder="15"
          value={form.commissionRate}
          onChange={(e) => update("commissionRate", e.currentTarget.value)}
        />
        <SelectField
          label="Commission type"
          value={form.commissionType}
          onChange={(e) =>
            update("commissionType", e.currentTarget.value as CommissionType)
          }
        >
          {COMMISSION_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </SelectField>
        <Field
          label="Book title"
          hint="Auto-fills from the author."
          autoComplete="off"
          highlightOnChange
          value={form.title}
          onChange={(e) => update("title", e.currentTarget.value)}
        />
        <Field
          label="Publisher"
          hint="Auto-fills from the selected editor."
          autoComplete="off"
          highlightOnChange
          value={form.publisher}
          onChange={(e) => update("publisher", e.currentTarget.value)}
        />
        <div className="sm:col-span-2">
          <Field
            label="Sender name"
            hint="Signs the email. Auto-fills from the author's head agent."
            autoComplete="off"
            highlightOnChange
            value={form.senderName}
            onChange={(e) => update("senderName", e.currentTarget.value)}
          />
        </div>
      </div>

      <SplitPreview
        total={hasValidTotal ? totalNumber : null}
        commission={split.commission}
        author={split.author}
        commissionRate={rateNumber}
      />

      <div className="pt-1 flex items-center justify-between gap-4">
        <div className="min-h-[1.25rem] text-[0.92rem] leading-tight">
          <AnimatePresence mode="wait">
            {error && (
              <motion.span
                key="err"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -2 }}
                transition={{ duration: 0.24 }}
                className="text-wine"
              >
                {error}
              </motion.span>
            )}
            {authorsError && !error && (
              <motion.span
                key="auth-err"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-wine"
              >
                {authorsError}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <motion.button
          type="button"
          onClick={onGenerate}
          disabled={!canGenerate}
          whileTap={{ scale: canGenerate ? 0.985 : 1 }}
          className="group relative inline-flex items-center gap-2 px-5 py-2.5 text-[0.85rem] smallcaps text-paper bg-wine hover:bg-wine-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>{pending ? "Composing" : "Generate email"}</span>
          <span aria-hidden="true">→</span>
        </motion.button>
      </div>

      <EmailReveal email={email} onCopy={onCopy} copied={copied} ref={emailRef} />
    </div>
  );
}

function SplitPreview({
  total,
  commission,
  author,
  commissionRate,
}: {
  total: number | null;
  commission: number;
  author: number;
  commissionRate: number;
}) {
  return (
    <motion.div
      layout
      transition={{ duration: 0.3, ease: [0.2, 0.6, 0.2, 1] }}
      className="border-t border-rule pt-4 grid grid-cols-3 gap-4 text-[0.85rem]"
    >
      <Stat label="Total" value={total === null ? "—" : formatUSD(total)} />
      <Stat
        label={`Commission (${formatRate(commissionRate)})`}
        value={total === null ? "—" : formatUSD(commission)}
        tone="bronze"
      />
      <Stat
        label="To author"
        value={total === null ? "—" : formatUSD(author)}
        tone="forest"
      />
    </motion.div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "bronze" | "forest";
}) {
  const color =
    tone === "bronze"
      ? "var(--color-bronze-deep)"
      : tone === "forest"
        ? "var(--color-forest)"
        : "var(--color-ink)";
  return (
    <div>
      <div className="smallcaps text-ink-muted text-[0.74rem]">{label}</div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={value}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.24, ease: [0.2, 0.6, 0.2, 1] }}
          className="font-serif text-[1.3rem] tabular-nums"
          style={{ color }}
        >
          {value}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

type EmailRevealProps = {
  email: string | null;
  onCopy: () => void;
  copied: boolean;
};

const EmailReveal = forwardRef<HTMLTextAreaElement, EmailRevealProps>(
  function EmailReveal({ email, onCopy, copied }, ref) {
    return (
      <AnimatePresence>
        {email && (
          <motion.section
            key="email-reveal"
            initial={{ opacity: 0, y: -8, scaleY: 0.98 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -4, scaleY: 0.98 }}
            transition={{ duration: 0.45, ease: [0.2, 0.6, 0.2, 1] }}
            style={{ transformOrigin: "top" }}
            className="relative mt-3 border-t border-rule pt-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ background: "var(--color-wine)" }}
                />
                <h3 className="smallcaps text-[0.82rem] text-ink-muted">
                  Composed email
                </h3>
              </div>
              <motion.button
                type="button"
                onClick={onCopy}
                whileTap={{ scale: 0.985 }}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-[0.8rem] smallcaps border border-ink text-ink hover:bg-ink hover:text-paper transition-colors"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {copied ? (
                    <motion.span
                      key="copied"
                      initial={{ opacity: 0, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -3 }}
                      transition={{ duration: 0.18 }}
                      className="inline-flex items-center gap-1.5"
                    >
                      <svg width="11" height="11" viewBox="0 0 12 12">
                        <path
                          d="M2 6.5 L5 9 L10 3.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Copied
                    </motion.span>
                  ) : (
                    <motion.span
                      key="copy"
                      initial={{ opacity: 0, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -3 }}
                      transition={{ duration: 0.18 }}
                    >
                      Copy email
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
            <motion.textarea
              ref={ref}
              readOnly
              value={email}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.08, duration: 0.4 }}
              rows={Math.max(9, email.split("\n").length + 1)}
              className="w-full bg-paper-soft border border-rule-soft px-5 py-5 font-serif text-[1.12rem] leading-[1.7] text-ink resize-none focus:outline-none focus:border-ink/60 transition-colors whitespace-pre-wrap"
              spellCheck={false}
            />
            <div className="mt-2 text-[0.8rem] italic text-ink-muted">
              The text is yours to edit before pasting into your email client.
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    );
  },
);
