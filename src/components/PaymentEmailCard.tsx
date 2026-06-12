"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { listEditorOutreachAction } from "@/app/actions";
import { listPaymentEmailTemplatesAction } from "@/app/paymentEmailActions";
import type { AuthorRecord } from "@/lib/authors";
import type { EditorOutreachRecord } from "@/lib/editorOutreach";
import { planComposition, labelFor } from "@/lib/paymentEmail/composition";
import { SYSTEM_DEFAULT_TEMPLATE_ID } from "@/lib/paymentEmail/defaultTemplate";
import {
  renderBodyToPlainText,
  resolveFieldValues,
} from "@/lib/paymentEmail/resolve";
import type { PaymentEmailTemplateRecord } from "@/lib/paymentEmail/types";
import { requestEmailRefinement } from "@/lib/refineEmailClient";
import { AuthorPicker } from "./AuthorPicker";
import { EmailOutputBox } from "./EmailOutputBox";
import {
  EmailRevisionPanel,
  MAX_REVISION_INSTRUCTION,
} from "./EmailRevisionPanel";
import { Field, SelectField } from "./Field";
import { PaymentEmailTemplateBuilder } from "./PaymentEmailTemplateBuilder";
import { ManagePaymentTemplates } from "./ManagePaymentTemplates";

type Props = {
  authors: AuthorRecord[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  highlightId?: string | null;
  authorsError?: string | null;
  agencyName: string;
};

type BuilderState =
  | { open: false }
  | { open: true; mode: "blank" | "duplicate" | "version"; source: PaymentEmailTemplateRecord | null };

export function PaymentEmailCard({
  authors,
  selectedId,
  onSelect,
  highlightId,
  authorsError,
  agencyName,
}: Props) {
  const [templates, setTemplates] = useState<PaymentEmailTemplateRecord[] | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [builder, setBuilder] = useState<BuilderState>({ open: false });
  const [manageOpen, setManageOpen] = useState(false);

  const refreshTemplates = useCallback(
    async (preferId?: string | null) => {
      const r = await listPaymentEmailTemplatesAction();
      if (!r.ok) {
        setTemplateError(r.error);
        return;
      }
      setTemplateError(null);
      setTemplates(r.templates);
      setActiveTemplateId((prev) => {
        if (preferId && r.templates.some((t) => t.id === preferId)) return preferId;
        if (prev && r.templates.some((t) => t.id === prev)) return prev;
        return r.effectiveDefaultId;
      });
    },
    [],
  );

  useEffect(() => {
    refreshTemplates();
  }, [refreshTemplates]);

  const template = useMemo(
    () =>
      templates?.find((t) => t.id === activeTemplateId) ??
      templates?.find((t) => t.id === SYSTEM_DEFAULT_TEMPLATE_ID) ??
      null,
    [templates, activeTemplateId],
  );

  return (
    <div className="flex flex-col gap-5">
      <TemplateSelectorRow
        templates={templates}
        templateError={templateError}
        activeTemplateId={activeTemplateId}
        onChange={setActiveTemplateId}
        onBuildNew={() => setBuilder({ open: true, mode: "blank", source: null })}
        onManage={() => setManageOpen(true)}
      />

      {template && (
        <TemplateComposer
          template={template}
          authors={authors}
          selectedId={selectedId}
          onSelect={onSelect}
          highlightId={highlightId}
          authorsError={authorsError}
          agencyName={agencyName}
        />
      )}

      <AnimatePresence>
        {manageOpen && templates && (
          <ManagePaymentTemplates
            templates={templates}
            onClose={() => setManageOpen(false)}
            onSelect={(id) => {
              setActiveTemplateId(id);
              setManageOpen(false);
            }}
            onBuildNew={() => {
              setManageOpen(false);
              setBuilder({ open: true, mode: "blank", source: null });
            }}
            onDuplicate={(source) => {
              setManageOpen(false);
              setBuilder({ open: true, mode: "duplicate", source });
            }}
            onCreateVersion={(source) => {
              setManageOpen(false);
              setBuilder({ open: true, mode: "version", source });
            }}
            onChanged={async (preferId) => {
              await refreshTemplates(preferId);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {builder.open && (
          <PaymentEmailTemplateBuilder
            mode={builder.mode}
            source={builder.source}
            systemDefault={
              templates?.find((t) => t.id === SYSTEM_DEFAULT_TEMPLATE_ID) ?? null
            }
            onClose={() => setBuilder({ open: false })}
            onSaved={async (saved) => {
              await refreshTemplates(saved.id);
              setBuilder({ open: false });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Template selector row ───────────────────────────────────────────────────

function TemplateSelectorRow({
  templates,
  templateError,
  activeTemplateId,
  onChange,
  onBuildNew,
  onManage,
}: {
  templates: PaymentEmailTemplateRecord[] | null;
  templateError: string | null;
  activeTemplateId: string | null;
  onChange: (id: string) => void;
  onBuildNew: () => void;
  onManage: () => void;
}) {
  return (
    <section
      className="border border-rule-soft rounded-[3px] px-5 py-4"
      style={{ background: "var(--color-paper-soft)" }}
    >
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1 min-w-0">
          <div
            className="smallcaps text-[0.74rem] mb-1.5"
            style={{ color: "var(--color-ink-soft)" }}
          >
            Payment Email Template
          </div>
          <div className="relative">
            <select
              value={activeTemplateId ?? ""}
              onChange={(e) => onChange(e.currentTarget.value)}
              disabled={!templates}
              className="select-arrow w-full appearance-none bg-transparent border-0 border-b border-rule pl-0 pr-6 py-2 text-[1.08rem] font-serif text-ink focus:outline-none cursor-pointer"
            >
              {!templates ? (
                <option>Loading…</option>
              ) : templates.length === 0 ? (
                <option>No templates available</option>
              ) : (
                templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.isAgencyDefault ? " — agency default" : ""}
                    {t.isSystemDefault ? " — Plato default" : ""}
                  </option>
                ))
              )}
            </select>
          </div>
          {templateError && (
            <p className="mt-2 text-[0.84rem] text-wine">{templateError}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.985 }}
            onClick={onBuildNew}
            className="inline-flex items-center gap-2 px-4 py-2 text-[0.78rem] smallcaps text-paper bg-ink hover:bg-forest transition-colors"
          >
            Build New Template
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.985 }}
            onClick={onManage}
            className="inline-flex items-center gap-2 px-4 py-2 text-[0.78rem] smallcaps border border-ink text-ink hover:bg-ink hover:text-paper transition-colors"
          >
            Manage Templates
          </motion.button>
        </div>
      </div>
    </section>
  );
}

// ─── Per-template composer ──────────────────────────────────────────────────

function TemplateComposer({
  template,
  authors,
  selectedId,
  onSelect,
  highlightId,
  authorsError,
  agencyName,
}: {
  template: PaymentEmailTemplateRecord;
  authors: AuthorRecord[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  highlightId?: string | null;
  authorsError?: string | null;
  agencyName: string;
}) {
  const plan = useMemo(() => planComposition(template), [template]);
  const selected = useMemo(
    () => authors.find((a) => a.id === selectedId) ?? null,
    [authors, selectedId],
  );

  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [editors, setEditors] = useState<EditorOutreachRecord[]>([]);
  const [editorsLoading, setEditorsLoading] = useState(false);
  const [selectedEditorId, setSelectedEditorId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const emailRef = useRef<HTMLTextAreaElement>(null);

  // Revision panel
  const [revisionInstruction, setRevisionInstruction] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [refineSuccess, setRefineSuccess] = useState(false);

  // Reset state when the selected template changes — composition fields and
  // calculations differ per template.
  useEffect(() => {
    setInputs({});
    setEmail(null);
    setError(null);
  }, [template.id]);

  // Author switch → reset email + reload editors, preserve typed inputs that
  // aren't author-derived. Auto-fill `senderName` from the author's head agent
  // when the field is part of the form and the user hasn't typed an override.
  useEffect(() => {
    setEmail(null);
    setSelectedEditorId("");
    setEditors([]);
    if (!selected) return;
    setInputs((prev) => {
      const next = { ...prev };
      // Clear stale editor inputs so they don't carry across author switches.
      delete next.editorFirstName;
      delete next.editorLastName;
      delete next.editorFullName;
      delete next.editorEmail;
      delete next.publishingHouse;
      return next;
    });
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

  // When the email is cleared (input edits, author switch), reset the revision
  // panel so it never lingers without an email to act on.
  useEffect(() => {
    if (email === null) {
      setRevisionInstruction("");
      setRefineError(null);
      setRefineSuccess(false);
    }
  }, [email]);

  // Live preview of resolved values — drives the summary row + calculated readouts.
  const values = useMemo(
    () =>
      resolveFieldValues({
        template,
        author: selected,
        editor: editors.find((e) => e.id === selectedEditorId) ?? null,
        paymentDetails: selected?.paymentDetails ?? null,
        agencyName,
        inputs,
      }),
    [template, selected, editors, selectedEditorId, agencyName, inputs],
  );

  function updateInput(key: string, value: string) {
    setInputs((prev) => ({ ...prev, [key]: value }));
    setEmail(null);
    if (error) setError(null);
  }

  function onEditorChange(id: string) {
    setSelectedEditorId(id);
    const editor = editors.find((e) => e.id === id) ?? null;
    setInputs((prev) => {
      const next = { ...prev };
      if (editor) {
        next.editorFirstName = editor.editorFirstName;
        next.editorLastName = editor.editorLastName;
        next.editorFullName = `${editor.editorFirstName} ${editor.editorLastName}`.trim();
        next.editorEmail = editor.editorEmail;
        next.publishingHouse = editor.publishingHouse;
      } else {
        delete next.editorFirstName;
        delete next.editorLastName;
        delete next.editorFullName;
        delete next.editorEmail;
        delete next.publishingHouse;
      }
      return next;
    });
    setEmail(null);
    if (error) setError(null);
  }

  function checkRequired(): string | null {
    if (plan.needsAuthor && !selected) return "Choose an author first.";
    for (const d of plan.descriptors) {
      if (d.kind === "built_in") {
        if (d.field.category !== "standard_input") continue;
        if (d.field.key === "totalPayment") {
          const n = Number.parseFloat((inputs.totalPayment ?? "").replace(/[^0-9.]/g, ""));
          if (!Number.isFinite(n) || n <= 0) {
            return "Enter a total payment amount greater than zero.";
          }
        }
      } else if (d.kind === "custom" && d.required) {
        const v = inputs[d.field.fieldKey]?.trim();
        if (!v) return `${d.field.label} is required.`;
      }
    }
    return null;
  }

  function onGenerate() {
    setError(null);
    const msg = checkRequired();
    if (msg) {
      setError(msg);
      return;
    }
    startTransition(() => {
      const body = renderBodyToPlainText(template.body, values, (key) =>
        labelFor(key, template),
      );
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
    } catch {
      setError("Could not copy. Select the text and copy it manually.");
    }
  }

  function onInstructionChange(value: string) {
    setRevisionInstruction(value.slice(0, MAX_REVISION_INSTRUCTION));
    if (refineError) setRefineError(null);
    if (refineSuccess) setRefineSuccess(false);
  }

  async function onRefine() {
    if (!email) return;
    const instruction = revisionInstruction.trim();
    if (!instruction) {
      setRefineError("Tell Plato how you'd like to revise the email.");
      return;
    }
    setRefineError(null);
    setRefineSuccess(false);
    setIsRefining(true);
    const totalDisplay = values.display.get("totalPayment");
    const toAuthorDisplay =
      values.display.get("amountToAuthor") ??
      values.display.get("authorPayment");
    const result = await requestEmailRefinement({
      emailType: "payment",
      initialEmail: email,
      userInstruction: instruction,
      authorName: selected
        ? `${selected.firstName} ${selected.lastName}`.trim()
        : undefined,
      title: values.display.get("bookTitle") || undefined,
      publisher: values.display.get("publishingHouse") || undefined,
      editorName: values.display.get("editorFullName") || undefined,
      totalPayment:
        totalDisplay && totalDisplay !== "—" ? totalDisplay : undefined,
      authorPayment:
        toAuthorDisplay && toAuthorDisplay !== "—" ? toAuthorDisplay : undefined,
      commissionType: values.display.get("commissionType") || undefined,
    });
    setIsRefining(false);
    if (!result.ok) {
      setRefineError(result.error);
      return;
    }
    setEmail(result.revisedEmail);
    setRevisionInstruction("");
    setCopied(false);
    setRefineSuccess(true);
    setTimeout(() => setRefineSuccess(false), 2600);
  }

  return (
    <div className="flex flex-col gap-5">
      {plan.needsAuthor && (
        <AuthorPicker
          label="Author"
          authors={authors}
          value={selectedId}
          onChange={onSelect}
          highlightId={highlightId}
          required
        />
      )}

      {plan.needsEditor && selected ? (
        editorsLoading || editors.length > 0 ? (
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
            hint="No saved editors for this author — type the editor's name."
            autoComplete="off"
            value={inputs.editorFullName ?? ""}
            onChange={(e) => updateInput("editorFullName", e.currentTarget.value)}
          />
        )
      ) : plan.needsEditor ? (
        <Field
          label="Editor"
          hint="Type the editor's name, or select an author to pick a saved editor."
          autoComplete="off"
          value={inputs.editorFullName ?? ""}
          onChange={(e) => updateInput("editorFullName", e.currentTarget.value)}
        />
      ) : null}

      <DynamicFieldGrid
        plan={plan}
        template={template}
        author={selected}
        agencyName={agencyName}
        inputs={inputs}
        values={values}
        onInputChange={updateInput}
      />

      <SummaryRow template={template} values={values} />

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
          disabled={pending}
          whileTap={{ scale: pending ? 1 : 0.985 }}
          className="group relative inline-flex items-center gap-2 px-5 py-2.5 text-[0.85rem] smallcaps text-paper bg-wine hover:bg-wine-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>{pending ? "Composing" : "Generate email"}</span>
          <span aria-hidden="true">→</span>
        </motion.button>
      </div>

      <EmailOutputBox
        email={email}
        onCopy={onCopy}
        copied={copied}
        revised={refineSuccess}
        onChange={(v) => {
          setEmail(v);
          setCopied(false);
        }}
        ref={emailRef}
      />

      <EmailRevisionPanel
        visible={!!email}
        value={revisionInstruction}
        onChange={onInstructionChange}
        onSubmit={onRefine}
        isRefining={isRefining}
        error={refineError}
        success={refineSuccess}
      />
    </div>
  );
}

// ─── Dynamic field grid ─────────────────────────────────────────────────────

function DynamicFieldGrid({
  plan,
  template,
  author,
  agencyName,
  inputs,
  values,
  onInputChange,
}: {
  plan: ReturnType<typeof planComposition>;
  template: PaymentEmailTemplateRecord;
  author: AuthorRecord | null;
  agencyName: string;
  inputs: Record<string, string>;
  values: ReturnType<typeof resolveFieldValues>;
  onInputChange: (key: string, value: string) => void;
}) {
  // Skip selectors that already have a dedicated control (Author/Editor pickers).
  const skip = new Set([
    "authorFirstName",
    "authorLastName",
    "authorFullName",
    "authorEmail",
    "headAgent",
    "headAgentEmail",
    "assignedAssistant",
    "genre",
    "editorFirstName",
    "editorLastName",
    "editorFullName",
    "editorEmail",
  ]);
  // bookTitle, publishingHouse, agencyName are auto-filled but still shown
  // so the user can override (legacy behavior).

  const cells = plan.descriptors.filter((d) => {
    if (d.kind === "built_in" && skip.has(d.field.key)) return false;
    return true;
  });

  if (cells.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
      {cells.map((d, i) => {
        if (d.kind === "built_in") {
          return (
            <BuiltInCell
              key={`bi-${d.field.key}-${i}`}
              descriptor={d}
              author={author}
              agencyName={agencyName}
              value={inputs[d.field.key] ?? ""}
              onChange={(v) => onInputChange(d.field.key, v)}
            />
          );
        }
        if (d.kind === "custom") {
          return (
            <CustomCell
              key={`cf-${d.field.fieldKey}`}
              field={d.field}
              required={d.required}
              value={inputs[d.field.fieldKey] ?? ""}
              onChange={(v) => onInputChange(d.field.fieldKey, v)}
            />
          );
        }
        // calculated — read-only readout
        const display = values.display.get(d.field.fieldKey) ?? "—";
        const calcOk = values.calc.get(d.field.fieldKey);
        const errorish = calcOk && !calcOk.ok && calcOk.error !== "missing";
        return (
          <div key={`cc-${d.field.fieldKey}`} className="pt-1">
            <div
              className="smallcaps block text-[0.78rem] text-ink-muted mb-1.5"
              style={{ letterSpacing: "0.18em" }}
            >
              {d.field.label}
            </div>
            <div
              className="font-serif text-[1.1rem] tabular-nums"
              style={{ color: errorish ? "var(--color-wine)" : "var(--color-ink)" }}
            >
              {display}
            </div>
            {errorish && (
              <p className="mt-1 text-[0.78rem] text-wine">{calcOk.error}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BuiltInCell({
  descriptor,
  author,
  agencyName,
  value,
  onChange,
}: {
  descriptor: Extract<
    ReturnType<typeof planComposition>["descriptors"][number],
    { kind: "built_in" }
  >;
  author: AuthorRecord | null;
  agencyName: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const f = descriptor.field;
  const autoFill = useMemo(() => {
    if (f.category !== "crm" && f.category !== "standard_input") return "";
    switch (f.key) {
      case "bookTitle": return author?.title ?? "";
      case "genre": return author?.genre ?? "";
      case "agencyName": return agencyName ?? "";
      case "senderName": return author?.headAgent ?? "";
      default: return "";
    }
  }, [f.key, f.category, author, agencyName]);

  const effective = value !== "" ? value : autoFill;

  if (f.valueType === "dropdown" && f.options) {
    return (
      <SelectField
        label={f.label}
        value={value || f.defaultValue || f.options[0] || ""}
        onChange={(e) => onChange(e.currentTarget.value)}
        hint={f.hint}
      >
        {f.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </SelectField>
    );
  }
  if (f.valueType === "long_text") {
    return (
      <div className="pt-1 sm:col-span-2">
        <label className="smallcaps block text-[0.78rem] text-ink-muted mb-1.5">
          {f.label}
        </label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.currentTarget.value)}
          rows={3}
          className="w-full bg-transparent border-0 border-b border-rule px-0 py-2 text-[1.05rem] text-ink focus:outline-none resize-none"
        />
      </div>
    );
  }
  return (
    <Field
      label={f.label}
      hint={f.hint}
      placeholder={f.placeholder}
      autoComplete="off"
      inputMode={
        f.valueType === "currency" || f.valueType === "percentage" || f.valueType === "number"
          ? "decimal"
          : undefined
      }
      type={f.valueType === "date" ? "date" : "text"}
      highlightOnChange={!!autoFill && value === ""}
      value={effective}
      onChange={(e) => onChange(e.currentTarget.value)}
    />
  );
}

function CustomCell({
  field,
  required,
  value,
  onChange,
}: {
  field: NonNullable<PaymentEmailTemplateRecord["customFields"]>[number];
  required: boolean;
  value: string;
  onChange: (v: string) => void;
}) {
  const isNumeric =
    field.fieldType === "number" ||
    field.fieldType === "currency" ||
    field.fieldType === "percentage";

  if (field.fieldType === "dropdown") {
    return (
      <SelectField
        label={field.label}
        required={required}
        value={value || field.defaultValue || ""}
        onChange={(e) => onChange(e.currentTarget.value)}
      >
        <option value="">Select…</option>
        {field.dropdownOptions.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </SelectField>
    );
  }
  if (field.fieldType === "long_text") {
    return (
      <div className="pt-1 sm:col-span-2">
        <label className="smallcaps block text-[0.78rem] text-ink-muted mb-1.5">
          {field.label}
          {required && <span className="ml-1 text-wine">*</span>}
        </label>
        <textarea
          value={value || field.defaultValue || ""}
          onChange={(e) => onChange(e.currentTarget.value)}
          placeholder={field.placeholder ?? undefined}
          rows={3}
          className="w-full bg-transparent border-0 border-b border-rule px-0 py-2 text-[1.05rem] text-ink focus:outline-none resize-none"
        />
      </div>
    );
  }
  return (
    <Field
      label={field.label}
      required={required}
      placeholder={field.placeholder ?? undefined}
      autoComplete="off"
      inputMode={isNumeric ? "decimal" : undefined}
      value={value || field.defaultValue || ""}
      onChange={(e) => onChange(e.currentTarget.value)}
    />
  );
}

// ─── Configurable summary row ───────────────────────────────────────────────

function SummaryRow({
  template,
  values,
}: {
  template: PaymentEmailTemplateRecord;
  values: ReturnType<typeof resolveFieldValues>;
}) {
  const items = template.summaryFields;
  if (items.length === 0) return null;
  return (
    <motion.div
      layout
      transition={{ duration: 0.3, ease: [0.2, 0.6, 0.2, 1] }}
      className="border-t border-rule pt-4 grid gap-4 text-[0.85rem]"
      style={{
        gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, minmax(0, 1fr))`,
      }}
    >
      {items.map((s, i) => {
        const display = values.display.get(s.fieldKey) ?? "—";
        // Tone the second slot bronze and the third forest — preserves the
        // existing Plato Default's color story (Total → Commission → To Author).
        const tone =
          i === 0
            ? "var(--color-ink)"
            : i === 1
              ? "var(--color-bronze-deep)"
              : "var(--color-forest)";
        return (
          <div key={s.fieldKey}>
            <div className="smallcaps text-ink-muted text-[0.74rem]">
              {s.summaryLabel}
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={display}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.24, ease: [0.2, 0.6, 0.2, 1] }}
                className="font-serif text-[1.3rem] tabular-nums"
                style={{ color: tone }}
              >
                {display}
              </motion.div>
            </AnimatePresence>
          </div>
        );
      })}
    </motion.div>
  );
}

