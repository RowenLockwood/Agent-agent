"use client";

import { motion } from "framer-motion";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  createPaymentEmailTemplateAction,
  importTemplateTextAction,
  updatePaymentEmailTemplateAction,
} from "@/app/paymentEmailActions";
import {
  buildFieldLookup,
  newCustomFieldKey,
  validateFormula,
} from "@/lib/paymentEmail/formula";
import {
  BUILT_IN_FIELDS,
  CALCULATION_RECIPES,
  getBuiltInField,
  type BuiltInField,
} from "@/lib/paymentEmail/registry";
import {
  collectTemplateFieldRefs,
  expandWithCalcDeps,
  inferSelectors,
} from "@/lib/paymentEmail/resolve";
import {
  CUSTOM_FIELD_TYPE_LABELS,
  CUSTOM_FIELD_TYPES,
  CALC_OUTPUT_TYPE_LABELS,
  CALC_OUTPUT_TYPES,
  FORMULA_OPS,
  FORMULA_OP_GLYPHS,
  type BodySegment,
  type CalcOutputType,
  type CalculatedFieldRecord,
  type CustomFieldRecord,
  type CustomFieldType,
  type FormulaOp,
  type FormulaToken,
  type PaymentEmailTemplateRecord,
  type SummaryFieldRecord,
  type TemplateDraftInput,
} from "@/lib/paymentEmail/types";

type Mode = "blank" | "duplicate" | "version";

type Props = {
  mode: Mode;
  /** Source template for duplicate / version; null for "blank". */
  source: PaymentEmailTemplateRecord | null;
  /** The Plato system default, available as a starting-point in "blank" mode. */
  systemDefault: PaymentEmailTemplateRecord | null;
  onClose: () => void;
  onSaved: (saved: PaymentEmailTemplateRecord) => void;
};

type Step = "start" | "editor";

// ─── Draft state ────────────────────────────────────────────────────────────

type Draft = TemplateDraftInput & {
  parentTemplateId: string | null;
  /** When set, we PUT instead of POST (editing a user-saved template). */
  editingId: string | null;
};

function emptyDraft(): Draft {
  return {
    name: "",
    description: "",
    subjectLine: null,
    body: [],
    customFields: [],
    calculatedFields: [],
    summaryFields: [],
    parentTemplateId: null,
    editingId: null,
  };
}

function draftFromTemplate(t: PaymentEmailTemplateRecord, mode: Mode): Draft {
  const isVersion = mode === "version";
  return {
    name: isVersion
      ? `${t.name} (v${t.versionNumber + 1})`
      : `${t.name} (copy)`,
    description: t.description,
    subjectLine: t.subjectLine,
    body: structuredClone(t.body),
    customFields: structuredClone(t.customFields),
    calculatedFields: structuredClone(t.calculatedFields),
    summaryFields: structuredClone(t.summaryFields),
    parentTemplateId: isVersion ? t.id : null,
    editingId: null,
  };
}

// ─── Builder shell ──────────────────────────────────────────────────────────

export function PaymentEmailTemplateBuilder({
  mode,
  source,
  systemDefault,
  onClose,
  onSaved,
}: Props) {
  const [step, setStep] = useState<Step>(
    source ? "editor" : "start",
  );
  const [draft, setDraft] = useState<Draft>(
    source ? draftFromTemplate(source, mode) : emptyDraft(),
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  function save() {
    setSaveError(null);
    if (!draft.name.trim()) {
      setSaveError("Give this template a name before saving.");
      return;
    }
    if (draft.body.length === 0) {
      setSaveError("Add some text to the template body before saving.");
      return;
    }
    startTransition(async () => {
      const payload: TemplateDraftInput & { parentTemplateId?: string | null } = {
        name: draft.name,
        description: draft.description,
        subjectLine: draft.subjectLine,
        body: draft.body,
        customFields: draft.customFields,
        calculatedFields: draft.calculatedFields,
        summaryFields: draft.summaryFields,
        parentTemplateId: draft.parentTemplateId,
      };
      const r = draft.editingId
        ? await updatePaymentEmailTemplateAction(draft.editingId, payload)
        : await createPaymentEmailTemplateAction(payload);
      if (!r.ok) {
        setSaveError(r.error);
        return;
      }
      onSaved(r.template);
    });
  }

  return (
    <>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="fixed inset-0 z-40"
        style={{ background: "rgba(26,23,20,0.55)" }}
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        key="builder"
        role="dialog"
        aria-modal="true"
        aria-label="Payment email template builder"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.32, ease: [0.2, 0.6, 0.2, 1] }}
        className="fixed inset-4 md:inset-10 lg:inset-14 z-50 overflow-hidden flex flex-col"
        style={{
          background: "var(--color-paper)",
          border: "1px solid var(--color-rule)",
          boxShadow: "0 32px 80px -20px rgba(26,23,20,0.55)",
        }}
      >
        <BuilderHeader
          mode={mode}
          step={step}
          draft={draft}
          onNameChange={(name) => setDraft({ ...draft, name })}
          onClose={onClose}
          onSave={save}
          pending={pending}
          saveError={saveError}
        />
        <div className="flex-1 min-h-0 overflow-auto">
          {step === "start" ? (
            <StartingPointStep
              systemDefault={systemDefault}
              onCancel={onClose}
              onDraftReady={(d) => {
                setDraft(d);
                setStep("editor");
              }}
            />
          ) : (
            <BuilderEditor draft={draft} setDraft={setDraft} />
          )}
        </div>
      </motion.div>
    </>
  );
}

function BuilderHeader({
  mode,
  step,
  draft,
  onNameChange,
  onClose,
  onSave,
  pending,
  saveError,
}: {
  mode: Mode;
  step: Step;
  draft: Draft;
  onNameChange: (name: string) => void;
  onClose: () => void;
  onSave: () => void;
  pending: boolean;
  saveError: string | null;
}) {
  const heading =
    mode === "duplicate"
      ? "Duplicate Template"
      : mode === "version"
        ? "Create New Version"
        : "Build New Template";
  return (
    <header
      className="flex items-center justify-between gap-4 px-6 sm:px-10 py-5 border-b"
      style={{ borderColor: "var(--color-rule-soft)" }}
    >
      <div className="flex items-baseline gap-4 min-w-0">
        <h2
          className="font-serif text-[1.75rem] leading-none whitespace-nowrap"
          style={{ color: "var(--color-ink)" }}
        >
          {heading}
        </h2>
        {step === "editor" && (
          <input
            value={draft.name}
            onChange={(e) => onNameChange(e.currentTarget.value)}
            placeholder="Template name"
            className="font-serif italic text-[1.1rem] bg-transparent border-b border-rule-soft focus:border-ink/60 focus:outline-none px-1 py-1 min-w-[12rem]"
            style={{ color: "var(--color-ink-soft)" }}
          />
        )}
      </div>
      <div className="flex items-center gap-3">
        {saveError && (
          <span className="text-[0.85rem] text-wine max-w-md truncate" title={saveError}>
            {saveError}
          </span>
        )}
        <motion.button
          type="button"
          onClick={onClose}
          whileTap={{ scale: 0.985 }}
          className="px-4 py-2 text-[0.78rem] smallcaps border border-ink/40 text-ink hover:bg-ink hover:text-paper transition-colors"
        >
          Close
        </motion.button>
        {step === "editor" && (
          <motion.button
            type="button"
            onClick={onSave}
            disabled={pending}
            whileTap={{ scale: pending ? 1 : 0.985 }}
            className="px-5 py-2 text-[0.85rem] smallcaps text-paper bg-wine hover:bg-wine-deep transition-colors disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save Template"}
          </motion.button>
        )}
      </div>
    </header>
  );
}

// ─── Step 1: Starting point ─────────────────────────────────────────────────

function StartingPointStep({
  systemDefault,
  onCancel,
  onDraftReady,
}: {
  systemDefault: PaymentEmailTemplateRecord | null;
  onCancel: () => void;
  onDraftReady: (d: Draft) => void;
}) {
  const [pasteText, setPasteText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  /**
   * "Start from Plato Default" preloads the seeded default's body, custom
   * fields, calculations, and summary row so the user can revise the standard
   * Payment Email without overwriting the protected original.
   */
  function startFromPlatoDefault() {
    if (!systemDefault) {
      setImportError("The Plato Default isn't loaded yet. Try again in a moment.");
      return;
    }
    const d = draftFromTemplate(systemDefault, "duplicate");
    // Override the duplicate suffix with something more inviting for first-time
    // users who haven't named their variation yet.
    d.name = "My Payment Email";
    onDraftReady(d);
  }

  function startBlank() {
    onDraftReady(emptyDraft());
  }

  function startFromText(text: string, name = "Custom Payment Email") {
    if (!text.trim()) {
      setImportError("Add some text first.");
      return;
    }
    const d = emptyDraft();
    d.name = name;
    d.body = [{ t: "text", v: text }];
    onDraftReady(d);
  }

  async function onFile(file: File) {
    setImportError(null);
    setImporting(true);
    const fd = new FormData();
    fd.append("file", file);
    const r = await importTemplateTextAction(fd);
    setImporting(false);
    if (!r.ok) {
      setImportError(r.error);
      return;
    }
    if (!r.text.trim()) {
      setImportError("That file looks empty after reading.");
      return;
    }
    const stem = file.name.replace(/\.[^.]+$/, "");
    startFromText(r.text, stem || "Imported Template");
  }

  return (
    <div className="max-w-3xl mx-auto px-6 sm:px-10 py-10 flex flex-col gap-7">
      <SectionTitle eyebrow="Step 1" title="Choose a starting point" />
      <p
        className="font-serif italic text-[1.05rem] -mt-3"
        style={{ color: "var(--color-ink-muted)" }}
      >
        Start blank, paste an existing email, or upload a .txt or .docx file —
        Plato keeps the text yours to revise.
      </p>

      <StartCard
        title="Start from Plato Default"
        description="Begin with Plato's standard payment confirmation and rework it."
        onClick={startFromPlatoDefault}
      />

      <StartCard
        title="Start Blank"
        description="A fresh canvas — bring your own copy."
        onClick={startBlank}
      />

      <StartCard
        title="Paste Template Text"
        description="Paste an email you've sent before. Plato will let you add reusable fields next."
      >
        <textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.currentTarget.value)}
          rows={6}
          placeholder="Dear …"
          className="mt-3 w-full bg-paper border border-rule-soft px-4 py-3 font-serif text-[1rem] leading-[1.6] text-ink resize-none focus:outline-none focus:border-ink/60 transition-colors"
        />
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => startFromText(pasteText, "Pasted Payment Email")}
            className="px-4 py-2 text-[0.78rem] smallcaps text-paper bg-ink hover:bg-forest transition-colors"
          >
            Use This Text
          </button>
        </div>
      </StartCard>

      <StartCard
        title="Upload Template File"
        description="Drop in a .txt or .docx file (1 MB max). Plato extracts the plain text."
      >
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={importing}
            className="px-4 py-2 text-[0.78rem] smallcaps border border-ink text-ink hover:bg-ink hover:text-paper transition-colors disabled:opacity-60"
          >
            {importing ? "Reading…" : "Choose File"}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".txt,.docx"
            onChange={(e) => {
              const f = e.currentTarget.files?.[0];
              if (f) onFile(f);
              e.currentTarget.value = "";
            }}
            className="sr-only"
          />
          <span className="text-[0.84rem] italic text-ink-muted">
            Plain-text only. No macros or scripts are executed.
          </span>
        </div>
        {importError && (
          <p className="mt-2 text-[0.85rem] text-wine">{importError}</p>
        )}
      </StartCard>

      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="text-[0.82rem] smallcaps text-ink-muted hover:text-ink transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function StartCard({
  title,
  description,
  onClick,
  children,
}: {
  title: string;
  description: string;
  onClick?: () => void;
  children?: ReactNode;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className="block w-full text-left rounded-[3px] border border-rule-soft px-5 py-5 hover:border-ink/40 transition-colors"
      style={{ background: "var(--color-paper-soft)" }}
    >
      <h3
        className="font-serif text-[1.2rem]"
        style={{ color: "var(--color-ink)" }}
      >
        {title}
      </h3>
      <p
        className="font-sans text-[0.88rem] mt-1"
        style={{ color: "var(--color-ink-muted)" }}
      >
        {description}
      </p>
      {children}
    </Tag>
  );
}

function SectionTitle({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div>
      <div className="smallcaps text-[0.7rem] text-ink-muted">{eyebrow}</div>
      <h3
        className="mt-1 font-serif text-[1.6rem] leading-tight"
        style={{ color: "var(--color-ink)" }}
      >
        {title}
      </h3>
    </div>
  );
}

// ─── Step 2: Editor (canvas + palette + sections) ────────────────────────────

function BuilderEditor({
  draft,
  setDraft,
}: {
  draft: Draft;
  setDraft: (next: Draft) => void;
}) {
  const canvasHandle = useRef<CanvasHandle>(null);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 px-6 sm:px-10 py-8">
      <div className="flex flex-col gap-8 min-w-0">
        <TemplateCanvas ref={canvasHandle} draft={draft} setDraft={setDraft} />
        <CalculationsSection draft={draft} setDraft={setDraft} />
        <SummaryRowConfigurator draft={draft} setDraft={setDraft} />
        <TemplatePreview draft={draft} />
      </div>
      <BuiltInFieldPalette
        draft={draft}
        setDraft={setDraft}
        canvasHandle={canvasHandle}
      />
    </div>
  );
}

// ─── Field palette ──────────────────────────────────────────────────────────

const PALETTE_GROUP_LABELS: Record<BuiltInField["paletteGroup"], string> = {
  author_book: "Author & Book",
  editor_publisher: "Editor & Publisher",
  agency: "Agency",
  payment_input: "Payment Inputs",
  payment_details: "Payment Details",
  calculated: "Calculations",
};

function BuiltInFieldPalette({
  draft,
  setDraft,
  canvasHandle,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  canvasHandle: React.RefObject<CanvasHandle | null>;
}) {
  const [query, setQuery] = useState("");
  const [showCustomModal, setShowCustomModal] = useState(false);

  const groups = useMemo(() => {
    const out: Record<string, { label: string; items: PaletteItem[] }> = {};
    const q = query.trim().toLowerCase();
    function add(group: string, label: string, item: PaletteItem) {
      if (q && !label.toLowerCase().includes(q) && !item.label.toLowerCase().includes(q)) return;
      if (!out[group]) out[group] = { label, items: [] };
      out[group].items.push(item);
    }
    for (const f of BUILT_IN_FIELDS) {
      add(f.paletteGroup, PALETTE_GROUP_LABELS[f.paletteGroup], {
        kind: "built_in",
        key: f.key,
        label: f.label,
      });
    }
    for (const cf of draft.customFields) {
      add("custom_inputs", "Custom Inputs", {
        kind: "custom",
        key: cf.fieldKey,
        label: cf.label,
      });
    }
    for (const cc of draft.calculatedFields) {
      // Skip calc fields that already match a built-in calc to avoid duplicates.
      if (BUILT_IN_FIELDS.some((b) => b.key === cc.fieldKey)) continue;
      add("calculated", PALETTE_GROUP_LABELS.calculated, {
        kind: "calculated",
        key: cc.fieldKey,
        label: cc.label,
      });
    }
    return Object.entries(out);
  }, [draft.customFields, draft.calculatedFields, query]);

  return (
    <aside
      className="border border-rule-soft rounded-[3px] p-4 self-start sticky top-4"
      style={{ background: "var(--color-paper-soft)", maxHeight: "calc(100vh - 12rem)", overflow: "auto" }}
    >
      <div
        className="smallcaps text-[0.74rem] mb-2"
        style={{ color: "var(--color-ink-soft)" }}
      >
        Fields
      </div>
      <input
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
        placeholder="Search fields…"
        className="w-full bg-transparent border border-rule-soft px-3 py-1.5 text-[0.9rem] focus:outline-none focus:border-ink/50"
      />
      <button
        type="button"
        onClick={() => setShowCustomModal(true)}
        className="mt-3 w-full px-3 py-2 text-[0.8rem] smallcaps border border-ink text-ink hover:bg-ink hover:text-paper transition-colors"
      >
        + Create Custom Field
      </button>

      <div className="mt-4 flex flex-col gap-4">
        {groups.length === 0 && (
          <p className="text-[0.84rem] italic text-ink-muted">No matches.</p>
        )}
        {groups.map(([group, { label, items }]) => (
          <div key={group}>
            <div className="smallcaps text-[0.68rem] mb-1.5 text-ink-muted">
              {label}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {items.map((it) => (
                <FieldChip
                  key={it.key}
                  label={it.label}
                  onClick={() => {
                    // Prefer inserting at the caret/selection; fall back to
                    // appending if the canvas hasn't mounted yet.
                    if (canvasHandle.current) {
                      canvasHandle.current.insertField(it.key);
                    } else {
                      insertSegment(draft, setDraft, { t: "field", k: it.key });
                    }
                  }}
                  draggable
                  data-fieldkey={it.key}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {showCustomModal && (
        <CustomFieldModal
          existingKeys={draft.customFields.map((c) => c.fieldKey)}
          onClose={() => setShowCustomModal(false)}
          onSave={(field) => {
            setDraft({ ...draft, customFields: [...draft.customFields, field] });
            setShowCustomModal(false);
          }}
        />
      )}
    </aside>
  );
}

type PaletteItem = {
  kind: "built_in" | "custom" | "calculated";
  key: string;
  label: string;
};

function FieldChip({
  label,
  onClick,
  draggable,
  variant = "default",
  ...rest
}: {
  label: string;
  onClick?: () => void;
  draggable?: boolean;
  variant?: "default" | "inserted";
  [k: string]: unknown;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      draggable={draggable}
      onDragStart={(e) => {
        if (draggable && rest["data-fieldkey"]) {
          e.dataTransfer.setData(
            "application/x-plato-field",
            String(rest["data-fieldkey"]),
          );
          e.dataTransfer.effectAllowed = "copyMove";
        }
      }}
      className="inline-flex items-center gap-1 px-2 py-0.5 text-[0.82rem] rounded-[2px] border transition-colors"
      style={
        variant === "inserted"
          ? {
              borderColor: "var(--color-bronze)",
              background: "rgba(138,106,50,0.10)",
              color: "var(--color-ink)",
            }
          : {
              borderColor: "var(--color-rule)",
              background: "var(--color-paper)",
              color: "var(--color-ink-soft)",
            }
      }
    >
      <span aria-hidden="true" style={{ color: "var(--color-bronze)" }}>
        ◆
      </span>
      {label}
    </button>
  );
}

// ─── Template canvas ────────────────────────────────────────────────────────

function insertSegment(draft: Draft, setDraft: (d: Draft) => void, seg: BodySegment) {
  const body = draft.body.length === 0 ? [seg] : [...draft.body, seg];
  setDraft({ ...draft, body });
}

// Imperative handle the palette uses to insert a field at the user's current
// selection (or at the end if focus has wandered).
type CanvasHandle = {
  insertField: (key: string) => void;
};

// HTML-escape a user-entered text segment before setting innerHTML.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const CHIP_INLINE_STYLE =
  "display:inline-flex;align-items:center;gap:4px;padding:0 6px;margin:0 1px;" +
  "border:1px solid var(--color-bronze);background:rgba(138,106,50,0.10);" +
  "border-radius:2px;font-family:var(--font-sans);font-size:0.92em;" +
  "line-height:1.4;vertical-align:baseline;color:var(--color-ink-soft);";

function renderBodyToHtml(body: BodySegment[], draft: Draft): string {
  if (body.length === 0) return "";
  return body
    .map((seg) => {
      if (seg.t === "text") {
        // Convert raw newlines into <br>s so the contentEditable browser
        // engine renders multi-line bodies inline.
        return escapeHtml(seg.v).replace(/\n/g, "<br>");
      }
      const label = labelForKey(seg.k, draft);
      return (
        `<span class="plato-chip" contenteditable="false" data-fkey="${escapeHtml(seg.k)}" style="${CHIP_INLINE_STYLE}">` +
        escapeHtml(label) +
        "</span>"
      );
    })
    .join("");
}

function makeChipNode(key: string, label: string): HTMLSpanElement {
  const span = document.createElement("span");
  span.className = "plato-chip";
  span.setAttribute("contenteditable", "false");
  span.setAttribute("data-fkey", key);
  span.textContent = label;
  span.setAttribute("style", CHIP_INLINE_STYLE);
  return span;
}

/**
 * Walk the contentEditable DOM and reconstruct BodySegment[]. Browsers
 * insert <br> on Enter (modern WebKit/Blink) and sometimes wrap in <div>
 * or <p>; we treat each as a newline so the model stays consistent.
 */
function serializeCanvas(root: HTMLElement): BodySegment[] {
  const segments: BodySegment[] = [];
  let textBuf = "";
  function flushText() {
    if (textBuf) {
      segments.push({ t: "text", v: textBuf });
      textBuf = "";
    }
  }
  function walk(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      textBuf += node.textContent ?? "";
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    if (node.tagName === "BR") {
      textBuf += "\n";
      return;
    }
    if (node.classList.contains("plato-chip")) {
      const key = node.getAttribute("data-fkey");
      if (key) {
        flushText();
        segments.push({ t: "field", k: key });
      }
      return;
    }
    // <div>/<p> wrappers act as block boundaries.
    if (node.tagName === "DIV" || node.tagName === "P") {
      if (textBuf && !textBuf.endsWith("\n")) textBuf += "\n";
      for (const child of Array.from(node.childNodes)) walk(child);
      if (!textBuf.endsWith("\n")) textBuf += "\n";
      return;
    }
    for (const child of Array.from(node.childNodes)) walk(child);
  }
  for (const child of Array.from(root.childNodes)) walk(child);
  flushText();
  return segments;
}

/**
 * Insert a field chip at `range`. If the range covers any selected content
 * (e.g. the user highlighted "[author name]" in their pasted text), that
 * selection is REPLACED — that's the core UX the user asked for.
 */
function insertChipAtRange(root: HTMLElement, range: Range, chip: HTMLSpanElement): void {
  if (!root.contains(range.startContainer)) {
    // Drop landed outside the editable area — append at the end.
    range = document.createRange();
    range.selectNodeContents(root);
    range.collapse(false);
  }
  range.deleteContents();
  range.insertNode(chip);
  // Caret after the chip.
  const after = document.createRange();
  after.setStartAfter(chip);
  after.collapse(true);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(after);
}

const TemplateCanvas = forwardRef<CanvasHandle, {
  draft: Draft;
  setDraft: (d: Draft) => void;
}>(function TemplateCanvas({ draft, setDraft }, ref) {
  const editorRef = useRef<HTMLDivElement>(null);
  // The DOM is the source of truth while the user is typing. We track what
  // body shape we last rendered, and only re-paint the DOM when the body
  // changes from OUTSIDE this component (initial mount, "Start from Plato
  // Default" preload, programmatic chip insert).
  const lastRenderedBodyRef = useRef<string>("");

  useEffect(() => {
    if (!editorRef.current) return;
    const json = JSON.stringify(draft.body);
    if (json === lastRenderedBodyRef.current) return;
    editorRef.current.innerHTML = renderBodyToHtml(draft.body, draft);
    lastRenderedBodyRef.current = json;
  }, [draft.body, draft.customFields, draft.calculatedFields, draft]);

  function commitFromDOM() {
    if (!editorRef.current) return;
    const segments = serializeCanvas(editorRef.current);
    const json = JSON.stringify(segments);
    if (json === lastRenderedBodyRef.current) return;
    lastRenderedBodyRef.current = json;
    setDraft({ ...draft, body: segments });
  }

  function insertChipAt(
    range: Range | null,
    key: string,
  ): void {
    const root = editorRef.current;
    if (!root) return;
    const r = range ?? endRange(root);
    const chip = makeChipNode(key, labelForKey(key, draft));
    insertChipAtRange(root, r, chip);
    commitFromDOM();
  }

  function endRange(root: HTMLElement): Range {
    const r = document.createRange();
    r.selectNodeContents(root);
    r.collapse(false);
    return r;
  }

  useImperativeHandle(ref, () => ({
    insertField(key: string) {
      const root = editorRef.current;
      if (!root) return;
      // Use the active selection if it's inside the canvas; otherwise append.
      const sel = window.getSelection();
      let range: Range | null = null;
      if (sel && sel.rangeCount > 0 && root.contains(sel.anchorNode)) {
        range = sel.getRangeAt(0).cloneRange();
      }
      // Refocus so subsequent typing lands in the right place.
      root.focus();
      insertChipAt(range, key);
    },
  }));

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const key = e.dataTransfer.getData("application/x-plato-field");
    if (!key) return;
    const root = editorRef.current;
    if (!root) return;
    // Resolve the drop point to a range. caretRangeFromPoint is the WebKit /
    // Blink API; caretPositionFromPoint is the standardized one Firefox
    // implements. Either works here.
    let range: Range | null = null;
    const docCaretRangeFromPoint = (
      document as unknown as {
        caretRangeFromPoint?: (x: number, y: number) => Range | null;
      }
    ).caretRangeFromPoint;
    const docCaretPositionFromPoint = (
      document as unknown as {
        caretPositionFromPoint?: (
          x: number,
          y: number,
        ) => { offsetNode: Node; offset: number } | null;
      }
    ).caretPositionFromPoint;
    if (typeof docCaretRangeFromPoint === "function") {
      range = docCaretRangeFromPoint(e.clientX, e.clientY);
    } else if (typeof docCaretPositionFromPoint === "function") {
      const pos = docCaretPositionFromPoint(e.clientX, e.clientY);
      if (pos) {
        range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.collapse(true);
      }
    }
    root.focus();
    insertChipAt(range, key);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    // Backspace right after a chip should remove the chip. Browsers normally
    // delete a single character (the chip's contenteditable=false makes that
    // weird), so we handle it explicitly.
    if (e.key !== "Backspace" && e.key !== "Delete") return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const dir = e.key === "Backspace" ? -1 : 1;
    const candidate =
      dir === -1
        ? findChipBefore(range)
        : findChipAfter(range);
    if (candidate) {
      e.preventDefault();
      candidate.remove();
      commitFromDOM();
    }
  }

  return (
    <section>
      <SectionTitle eyebrow="Step 2" title="Template Editor" />
      <p
        className="mt-2 font-sans text-[0.88rem]"
        style={{ color: "var(--color-ink-muted)" }}
      >
        Type your email body. Drag a field from the palette onto any spot in
        the text — including over a placeholder like “[author name]” to
        replace it — or click a field to drop it where your cursor sits.
      </p>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        spellCheck
        onInput={commitFromDOM}
        onBlur={commitFromDOM}
        onKeyDown={onKeyDown}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("application/x-plato-field")) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }
        }}
        onDrop={onDrop}
        data-plato-canvas="true"
        className="plato-canvas mt-4 min-h-[14rem] bg-paper border border-rule-soft px-5 py-4 font-serif text-[1.05rem] leading-[1.75] text-ink whitespace-pre-wrap focus:outline-none focus:border-ink/60 transition-colors"
        style={{ wordBreak: "break-word" }}
      />
      {/* Empty-state placeholder. We render this outside the editor so
          contentEditable doesn't capture or pollute it. */}
      <PlatoCanvasPlaceholder body={draft.body} />
    </section>
  );
});

function PlatoCanvasPlaceholder({ body }: { body: BodySegment[] }) {
  const isEmpty =
    body.length === 0 ||
    (body.length === 1 && body[0].t === "text" && !body[0].v.trim());
  if (!isEmpty) return null;
  return (
    <p
      aria-hidden="true"
      className="mt-[-12rem] mb-[10.5rem] mx-5 italic text-ink-muted/70 pointer-events-none"
    >
      Start typing your email body — drag fields from the palette to insert them anywhere.
    </p>
  );
}

function findChipBefore(range: Range): HTMLElement | null {
  let node: Node | null = range.startContainer;
  let offset = range.startOffset;
  if (node.nodeType === Node.TEXT_NODE && offset > 0) return null;
  // Walk to the previous sibling chip if we're at the start of a text node
  // or container.
  while (node && node.parentNode) {
    const prev: Node | null =
      node.nodeType === Node.TEXT_NODE && offset === 0
        ? node.previousSibling
        : node.childNodes[offset - 1] ?? node.previousSibling;
    if (!prev) {
      node = node.parentNode;
      offset = 0;
      continue;
    }
    if (
      prev.nodeType === Node.ELEMENT_NODE &&
      (prev as HTMLElement).classList?.contains("plato-chip")
    ) {
      return prev as HTMLElement;
    }
    return null;
  }
  return null;
}

function findChipAfter(range: Range): HTMLElement | null {
  let node: Node | null = range.startContainer;
  const offset = range.startOffset;
  if (node.nodeType === Node.TEXT_NODE) {
    if (offset < (node.textContent?.length ?? 0)) return null;
    const next = node.nextSibling;
    if (
      next?.nodeType === Node.ELEMENT_NODE &&
      (next as HTMLElement).classList?.contains("plato-chip")
    ) {
      return next as HTMLElement;
    }
    return null;
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    const next = (node as HTMLElement).childNodes[offset];
    if (
      next?.nodeType === Node.ELEMENT_NODE &&
      (next as HTMLElement).classList?.contains("plato-chip")
    ) {
      return next as HTMLElement;
    }
  }
  return null;
}

// ─── Custom field modal ────────────────────────────────────────────────────

function CustomFieldModal({
  existingKeys,
  onClose,
  onSave,
}: {
  existingKeys: string[];
  onClose: () => void;
  onSave: (field: CustomFieldRecord) => void;
}) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<CustomFieldType>("short_text");
  const [required, setRequired] = useState(false);
  const [placeholder, setPlaceholder] = useState("");
  const [defaultValue, setDefaultValue] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [error, setError] = useState<string | null>(null);

  function save() {
    const trimmed = label.trim();
    if (!trimmed) {
      setError("Give this field a label.");
      return;
    }
    if (type === "dropdown") {
      const opts = optionsText
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (opts.length === 0) {
        setError("Add at least one dropdown option.");
        return;
      }
      onSave({
        fieldKey: newCustomFieldKey(trimmed, existingKeys),
        label: trimmed,
        fieldType: type,
        isRequired: required,
        placeholder: placeholder.trim() || null,
        defaultValue: defaultValue.trim() || null,
        dropdownOptions: opts,
      });
      return;
    }
    onSave({
      fieldKey: newCustomFieldKey(trimmed, existingKeys),
      label: trimmed,
      fieldType: type,
      isRequired: required,
      placeholder: placeholder.trim() || null,
      defaultValue: defaultValue.trim() || null,
      dropdownOptions: [],
    });
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(26,23,20,0.55)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-paper border border-rule p-6"
      >
        <h3 className="font-serif text-[1.5rem] mb-4">Create Custom Field</h3>
        <div className="flex flex-col gap-4">
          <Labeled label="Field Label">
            <input
              value={label}
              onChange={(e) => setLabel(e.currentTarget.value)}
              placeholder="Foreign Tax Withholding"
              className="w-full bg-transparent border-b border-rule px-0 py-1.5 text-[1rem] focus:outline-none"
            />
          </Labeled>
          <Labeled label="Field Type">
            <select
              value={type}
              onChange={(e) => setType(e.currentTarget.value as CustomFieldType)}
              className="select-arrow w-full appearance-none bg-transparent border-b border-rule px-0 py-1.5 text-[1rem] focus:outline-none"
            >
              {CUSTOM_FIELD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {CUSTOM_FIELD_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </Labeled>
          <div className="flex items-center gap-2 text-[0.92rem]">
            <input
              id="custom-required"
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.currentTarget.checked)}
            />
            <label htmlFor="custom-required">Required</label>
          </div>
          {type !== "dropdown" && (
            <Labeled label="Placeholder (optional)">
              <input
                value={placeholder}
                onChange={(e) => setPlaceholder(e.currentTarget.value)}
                className="w-full bg-transparent border-b border-rule px-0 py-1.5 text-[1rem] focus:outline-none"
              />
            </Labeled>
          )}
          {type !== "dropdown" && (
            <Labeled label="Default Value (optional)">
              <input
                value={defaultValue}
                onChange={(e) => setDefaultValue(e.currentTarget.value)}
                className="w-full bg-transparent border-b border-rule px-0 py-1.5 text-[1rem] focus:outline-none"
              />
            </Labeled>
          )}
          {type === "dropdown" && (
            <Labeled label="Dropdown Options (one per line)">
              <textarea
                rows={4}
                value={optionsText}
                onChange={(e) => setOptionsText(e.currentTarget.value)}
                placeholder={"Check\nWire\nDirect Deposit"}
                className="w-full bg-transparent border border-rule-soft p-2 text-[0.95rem] focus:outline-none resize-none"
              />
            </Labeled>
          )}
          {error && <p className="text-[0.85rem] text-wine">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-[0.8rem] smallcaps text-ink-muted hover:text-ink transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              className="px-4 py-1.5 text-[0.8rem] smallcaps text-paper bg-ink hover:bg-forest transition-colors"
            >
              Add Field
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="smallcaps text-[0.7rem] text-ink-muted mb-1">{label}</div>
      {children}
    </div>
  );
}

// ─── Calculations ───────────────────────────────────────────────────────────

function CalculationsSection({
  draft,
  setDraft,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
}) {
  const [adding, setAdding] = useState<null | "blank" | { recipe: typeof CALCULATION_RECIPES[number] }>(null);

  function removeCalc(index: number) {
    const next = draft.calculatedFields.slice();
    next.splice(index, 1);
    setDraft({ ...draft, calculatedFields: next });
  }

  function upsertCalc(rec: CalculatedFieldRecord) {
    const idx = draft.calculatedFields.findIndex((c) => c.fieldKey === rec.fieldKey);
    const next = draft.calculatedFields.slice();
    if (idx >= 0) next[idx] = rec;
    else next.push(rec);
    setDraft({ ...draft, calculatedFields: next });
  }

  return (
    <section>
      <SectionTitle eyebrow="Step 3" title="Calculations" />
      <p
        className="mt-2 font-sans text-[0.88rem]"
        style={{ color: "var(--color-ink-muted)" }}
      >
        Add formulas Plato calculates for you. Pick a ready-made recipe or
        build your own with the formula canvas.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setAdding("blank")}
          className="px-3 py-1.5 text-[0.78rem] smallcaps border border-ink text-ink hover:bg-ink hover:text-paper transition-colors"
        >
          + Add Calculated Field
        </button>
        <span className="text-[0.78rem] text-ink-muted">Or insert a recipe:</span>
        {CALCULATION_RECIPES.map((r) => (
          <button
            key={r.fieldKey}
            type="button"
            onClick={() =>
              upsertCalc({
                fieldKey: r.fieldKey,
                label: r.label,
                outputType: r.outputType,
                tokens: r.tokens,
              })
            }
            title={r.description}
            className="px-2.5 py-1 text-[0.78rem] rounded-[2px] border transition-colors"
            style={{
              borderColor: "var(--color-rule)",
              background: "var(--color-paper)",
              color: "var(--color-ink-soft)",
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      {draft.calculatedFields.length === 0 && (
        <p className="mt-4 italic text-[0.9rem] text-ink-muted">
          No calculations yet.
        </p>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {draft.calculatedFields.map((c, i) => (
          <CalcCard
            key={c.fieldKey}
            draft={draft}
            calc={c}
            onChange={(next) => upsertCalc(next)}
            onRemove={() => removeCalc(i)}
          />
        ))}
        {adding === "blank" && (
          <CalcCard
            draft={draft}
            calc={{ fieldKey: "", label: "", outputType: "currency", tokens: [] }}
            onChange={(next) => {
              upsertCalc(next);
              setAdding(null);
            }}
            onRemove={() => setAdding(null)}
            isDraft
          />
        )}
      </div>
    </section>
  );
}

function CalcCard({
  draft,
  calc,
  onChange,
  onRemove,
  isDraft,
}: {
  draft: Draft;
  calc: CalculatedFieldRecord;
  onChange: (next: CalculatedFieldRecord) => void;
  onRemove: () => void;
  isDraft?: boolean;
}) {
  const [label, setLabel] = useState(calc.label);
  const [outputType, setOutputType] = useState<CalcOutputType>(calc.outputType);
  const [tokens, setTokens] = useState<FormulaToken[]>(calc.tokens);
  const existingKeys = useMemo(
    () => [...draft.customFields.map((c) => c.fieldKey), ...draft.calculatedFields.map((c) => c.fieldKey)],
    [draft.customFields, draft.calculatedFields],
  );

  const lookup = useMemo(
    () => buildFieldLookup(draft.customFields, draft.calculatedFields),
    [draft.customFields, draft.calculatedFields],
  );

  const computedFieldKey = useMemo(
    () => calc.fieldKey || (label.trim() ? newCustomFieldKey(label, existingKeys) : ""),
    [calc.fieldKey, label, existingKeys],
  );

  const validation = useMemo(() => {
    if (!computedFieldKey || tokens.length === 0) return null;
    return validateFormula(
      tokens,
      computedFieldKey,
      outputType,
      lookup,
      draft.calculatedFields,
    );
  }, [computedFieldKey, tokens, outputType, lookup, draft.calculatedFields]);

  function commit() {
    onChange({
      fieldKey: computedFieldKey,
      label: label.trim(),
      outputType,
      tokens,
    });
  }

  return (
    <div className="border border-rule-soft rounded-[3px] p-4" style={{ background: "var(--color-paper)" }}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Labeled label="Calculated Field Label">
          <input
            value={label}
            onChange={(e) => setLabel(e.currentTarget.value)}
            onBlur={commit}
            placeholder="Net Agency Commission"
            className="w-full bg-transparent border-b border-rule px-0 py-1 text-[1rem] focus:outline-none"
          />
        </Labeled>
        <Labeled label="Output Type">
          <select
            value={outputType}
            onChange={(e) => {
              setOutputType(e.currentTarget.value as CalcOutputType);
            }}
            onBlur={commit}
            className="select-arrow w-full appearance-none bg-transparent border-b border-rule px-0 py-1 text-[1rem] focus:outline-none"
          >
            {CALC_OUTPUT_TYPES.map((t) => (
              <option key={t} value={t}>
                {CALC_OUTPUT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Labeled>
        <div className="flex items-end justify-end">
          <button
            type="button"
            onClick={onRemove}
            className="text-[0.78rem] smallcaps text-ink-muted hover:text-wine transition-colors"
          >
            {isDraft ? "Cancel" : "Remove"}
          </button>
        </div>
      </div>

      <div className="mt-4">
        <div className="smallcaps text-[0.7rem] text-ink-muted mb-1.5">Formula</div>
        <FormulaCanvas
          draft={draft}
          tokens={tokens}
          onChange={(next) => {
            setTokens(next);
            // commit on every token change so live preview updates.
            onChange({
              fieldKey: computedFieldKey,
              label: label.trim(),
              outputType,
              tokens: next,
            });
          }}
        />
        {validation && !validation.ok && (
          <p className="mt-2 text-[0.85rem] text-wine">{validation.error}</p>
        )}
        {validation && validation.ok && (
          <p className="mt-2 text-[0.82rem] italic text-ink-muted">
            Returns {CALC_OUTPUT_TYPE_LABELS[validation.resultType]}.
          </p>
        )}
      </div>
    </div>
  );
}

function FormulaCanvas({
  draft,
  tokens,
  onChange,
}: {
  draft: Draft;
  tokens: FormulaToken[];
  onChange: (next: FormulaToken[]) => void;
}) {
  function append(tok: FormulaToken) {
    onChange([...tokens, tok]);
  }
  function remove(i: number) {
    const next = tokens.slice();
    next.splice(i, 1);
    onChange(next);
  }

  const availableFields: { key: string; label: string }[] = [];
  for (const f of BUILT_IN_FIELDS) {
    if (
      f.valueType === "number" ||
      f.valueType === "currency" ||
      f.valueType === "percentage"
    ) {
      availableFields.push({ key: f.key, label: f.label });
    }
  }
  for (const cf of draft.customFields) {
    if (cf.fieldType === "number" || cf.fieldType === "currency" || cf.fieldType === "percentage") {
      availableFields.push({ key: cf.fieldKey, label: cf.label });
    }
  }
  for (const cc of draft.calculatedFields) {
    availableFields.push({ key: cc.fieldKey, label: cc.label });
  }

  return (
    <div>
      <div
        className="min-h-[3rem] border border-rule-soft px-3 py-2 flex flex-wrap gap-1.5 items-center bg-paper"
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("application/x-plato-field")) {
            e.preventDefault();
          }
        }}
        onDrop={(e) => {
          const key = e.dataTransfer.getData("application/x-plato-field");
          if (key) append({ kind: "field", key });
        }}
      >
        {tokens.length === 0 && (
          <span className="text-[0.86rem] italic text-ink-muted/80">
            Drop a field or click one below to start.
          </span>
        )}
        {tokens.map((tok, i) => (
          <span key={i} className="inline-flex items-center">
            {tok.kind === "field" ? (
              <FieldChip
                label={
                  getBuiltInField(tok.key)?.label
                  ?? draft.customFields.find((c) => c.fieldKey === tok.key)?.label
                  ?? draft.calculatedFields.find((c) => c.fieldKey === tok.key)?.label
                  ?? tok.key
                }
                variant="inserted"
                onClick={() => remove(i)}
              />
            ) : tok.kind === "op" ? (
              <button
                type="button"
                onClick={() => remove(i)}
                className="px-2 py-0.5 text-[0.95rem] border rounded-[2px]"
                style={{ borderColor: "var(--color-rule)", color: "var(--color-ink-soft)" }}
              >
                {FORMULA_OP_GLYPHS[tok.op]}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => remove(i)}
                className="px-1.5 text-[1rem] text-ink-muted"
              >
                {tok.kind === "lparen" ? "(" : ")"}
              </button>
            )}
          </span>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {FORMULA_OPS.map((op) => (
          <button
            key={op}
            type="button"
            onClick={() => append({ kind: "op", op })}
            className="px-2 py-0.5 text-[0.85rem] border rounded-[2px] hover:bg-ink hover:text-paper transition-colors"
            style={{ borderColor: "var(--color-rule)" }}
          >
            {FORMULA_OP_GLYPHS[op]}
          </button>
        ))}
        <button
          type="button"
          onClick={() => append({ kind: "lparen" })}
          className="px-2 py-0.5 text-[0.85rem] border rounded-[2px]"
          style={{ borderColor: "var(--color-rule)" }}
        >
          (
        </button>
        <button
          type="button"
          onClick={() => append({ kind: "rparen" })}
          className="px-2 py-0.5 text-[0.85rem] border rounded-[2px]"
          style={{ borderColor: "var(--color-rule)" }}
        >
          )
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {availableFields.map((f) => (
          <FieldChip
            key={f.key}
            label={f.label}
            onClick={() => append({ kind: "field", key: f.key })}
            draggable
            data-fieldkey={f.key}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Summary row configurator ──────────────────────────────────────────────

function SummaryRowConfigurator({
  draft,
  setDraft,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
}) {
  const [error, setError] = useState<string | null>(null);

  const eligible = useMemo(() => {
    const out: { key: string; label: string }[] = [];
    for (const f of BUILT_IN_FIELDS) {
      if (
        f.valueType === "currency" ||
        f.valueType === "percentage" ||
        f.valueType === "number"
      ) {
        out.push({ key: f.key, label: f.label });
      }
    }
    for (const cf of draft.customFields) {
      if (
        cf.fieldType === "currency" ||
        cf.fieldType === "percentage" ||
        cf.fieldType === "number"
      ) {
        out.push({ key: cf.fieldKey, label: cf.label });
      }
    }
    for (const cc of draft.calculatedFields) {
      out.push({ key: cc.fieldKey, label: cc.label });
    }
    return out;
  }, [draft.customFields, draft.calculatedFields]);

  function addSummary(key: string, label: string) {
    if (draft.summaryFields.some((s) => s.fieldKey === key)) return;
    if (draft.summaryFields.length >= 4) {
      setError("Choose up to four fields for the payment summary.");
      return;
    }
    setError(null);
    setDraft({
      ...draft,
      summaryFields: [...draft.summaryFields, { fieldKey: key, summaryLabel: shortenLabel(label) }],
    });
  }
  function removeSummary(i: number) {
    const next = draft.summaryFields.slice();
    next.splice(i, 1);
    setDraft({ ...draft, summaryFields: next });
    setError(null);
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= draft.summaryFields.length) return;
    const next = draft.summaryFields.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setDraft({ ...draft, summaryFields: next });
  }
  function updateLabel(i: number, label: string) {
    const next = draft.summaryFields.slice();
    next[i] = { ...next[i], summaryLabel: label };
    setDraft({ ...draft, summaryFields: next });
  }

  return (
    <section>
      <SectionTitle eyebrow="Step 4" title="Summary Row" />
      <p
        className="mt-2 font-sans text-[0.88rem]"
        style={{ color: "var(--color-ink-muted)" }}
      >
        Pick up to four values shown above “Generate Email” in the composition
        form. Currency, percentage, number, and calculated fields are eligible.
      </p>

      <div className="mt-4 flex flex-col gap-2">
        {draft.summaryFields.map((s, i) => {
          const item = eligible.find((e) => e.key === s.fieldKey);
          return (
            <div
              key={s.fieldKey}
              className="flex items-center gap-3 border border-rule-soft rounded-[3px] px-3 py-2"
              style={{ background: "var(--color-paper)" }}
            >
              <span className="text-[0.95rem] font-serif italic flex-1 truncate">
                {item?.label ?? s.fieldKey}
              </span>
              <input
                value={s.summaryLabel}
                onChange={(e) => updateLabel(i, e.currentTarget.value)}
                placeholder="Summary label"
                className="w-32 bg-transparent border-b border-rule-soft px-1 py-0.5 text-[0.92rem] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="text-[0.8rem] text-ink-muted disabled:opacity-40"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(i, +1)}
                disabled={i === draft.summaryFields.length - 1}
                className="text-[0.8rem] text-ink-muted disabled:opacity-40"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removeSummary(i)}
                className="text-[0.8rem] smallcaps text-ink-muted hover:text-wine transition-colors"
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>

      {error && <p className="mt-2 text-[0.85rem] text-wine">{error}</p>}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {eligible
          .filter((e) => !draft.summaryFields.some((s) => s.fieldKey === e.key))
          .map((e) => (
            <button
              key={e.key}
              type="button"
              onClick={() => addSummary(e.key, e.label)}
              className="px-2.5 py-1 text-[0.78rem] rounded-[2px] border"
              style={{
                borderColor: "var(--color-rule)",
                background: "var(--color-paper)",
                color: "var(--color-ink-soft)",
              }}
            >
              + {e.label}
            </button>
          ))}
      </div>
    </section>
  );
}

function shortenLabel(label: string) {
  if (label.length <= 20) return label;
  // Try to shorten well-known long labels into compact summary labels.
  return label.split(" ").slice(0, 2).join(" ");
}

// ─── Preview ───────────────────────────────────────────────────────────────

function TemplatePreview({ draft }: { draft: Draft }) {
  const refs = useMemo(() => {
    const tpl = draftToTemplate(draft);
    return collectTemplateFieldRefs(tpl);
  }, [draft]);
  const tpl = useMemo(() => draftToTemplate(draft), [draft]);
  const expanded = useMemo(() => expandWithCalcDeps(refs, tpl), [refs, tpl]);
  const { needsAuthor, needsEditor } = useMemo(
    () => inferSelectors(expanded),
    [expanded],
  );

  return (
    <section>
      <SectionTitle eyebrow="Step 5" title="Preview" />
      <div
        className="mt-3 border border-rule-soft p-4 font-serif text-[1.05rem] leading-[1.7] text-ink whitespace-pre-wrap"
        style={{ background: "var(--color-paper-soft)" }}
      >
        {draft.body.length === 0 ? (
          <span className="italic text-ink-muted">Your template appears here.</span>
        ) : (
          draft.body.map((seg, i) =>
            seg.t === "text" ? (
              <span key={i}>{seg.v}</span>
            ) : (
              <span
                key={i}
                className="px-1 mx-0.5 rounded-[2px]"
                style={{ background: "rgba(138,106,50,0.12)", color: "var(--color-ink-soft)", fontFamily: "var(--font-sans)", fontSize: "0.95em" }}
              >
                [{labelForKey(seg.k, draft)}]
              </span>
            ),
          )
        )}
      </div>
      <p className="mt-2 text-[0.82rem] italic text-ink-muted">
        This template needs:{" "}
        {needsAuthor ? "Author selector" : null}
        {needsAuthor && needsEditor ? " · " : ""}
        {needsEditor ? "Editor selector" : null}
        {!needsAuthor && !needsEditor ? "no CRM selectors" : ""}.
      </p>
    </section>
  );
}

function labelForKey(key: string, draft: Draft): string {
  return (
    getBuiltInField(key)?.label
    ?? draft.customFields.find((c) => c.fieldKey === key)?.label
    ?? draft.calculatedFields.find((c) => c.fieldKey === key)?.label
    ?? key
  );
}

function draftToTemplate(d: Draft): PaymentEmailTemplateRecord {
  return {
    id: "draft",
    name: d.name,
    description: d.description,
    subjectLine: d.subjectLine,
    body: d.body,
    isSystemDefault: false,
    isAgencyDefault: false,
    versionNumber: 1,
    parentTemplateId: d.parentTemplateId,
    customFields: d.customFields,
    calculatedFields: d.calculatedFields,
    summaryFields: d.summaryFields,
    updatedAt: new Date().toISOString(),
  };
}
