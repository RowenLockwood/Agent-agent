// Helpers shared between the composition form and the builder preview. Pure
// functions only — no IO.

import type { BuiltInField } from "./registry";
import {
  BUILT_IN_FIELDS,
  getBuiltInField,
} from "./registry";
import {
  collectTemplateFieldRefs,
  expandWithCalcDeps,
  inferSelectors,
} from "./resolve";
import type {
  CalculatedFieldRecord,
  CustomFieldRecord,
  PaymentEmailTemplateRecord,
} from "./types";

export type CompositionFieldDescriptor =
  | {
      kind: "built_in";
      field: BuiltInField;
      /** Required = inferred from template usage + CRM/standard need. */
      required: boolean;
      /** Editable = user can override (default true). */
      editable: boolean;
    }
  | {
      kind: "custom";
      field: CustomFieldRecord;
      required: boolean;
    }
  | {
      kind: "calculated";
      field: CalculatedFieldRecord;
    };

export type CompositionPlan = {
  needsAuthor: boolean;
  needsEditor: boolean;
  /** Descriptors in the order they should appear in the form. */
  descriptors: CompositionFieldDescriptor[];
};

/**
 * Decide which fields the composition form should show for the selected
 * template. Includes every field directly inserted in the body, every field
 * required by a calculation (even if not in the body), and every summary-row
 * field. Hides unrelated built-ins.
 */
export function planComposition(
  template: PaymentEmailTemplateRecord,
): CompositionPlan {
  const baseRefs = collectTemplateFieldRefs(template);
  const expanded = expandWithCalcDeps(baseRefs, template);
  const { needsAuthor, needsEditor } = inferSelectors(expanded);

  const descriptors: CompositionFieldDescriptor[] = [];

  // Built-in inputs first — preserve a sensible visual order driven by the
  // palette groups. CRM fields appear above standard inputs so auto-fills come
  // first; sender fields land last by group.
  const groupOrder: BuiltInField["paletteGroup"][] = [
    "author_book",
    "editor_publisher",
    "payment_details",
    "payment_input",
    "agency",
  ];
  for (const group of groupOrder) {
    for (const f of BUILT_IN_FIELDS) {
      if (f.paletteGroup !== group) continue;
      if (!expanded.has(f.key)) continue;
      if (f.category === "calculated") continue;
      descriptors.push({
        kind: "built_in",
        field: f,
        required: true,
        editable: true,
      });
    }
  }

  // Custom inputs.
  for (const cf of template.customFields) {
    if (!expanded.has(cf.fieldKey)) continue;
    descriptors.push({ kind: "custom", field: cf, required: cf.isRequired });
  }

  // Calculated fields — read-only summary entries at the end.
  for (const c of template.calculatedFields) {
    if (!expanded.has(c.fieldKey)) continue;
    descriptors.push({ kind: "calculated", field: c });
  }

  return { needsAuthor, needsEditor, descriptors };
}

/** Look up the display label for any field key (built-in / custom / calc). */
export function labelFor(
  key: string,
  template: PaymentEmailTemplateRecord,
): string {
  const builtin = getBuiltInField(key);
  if (builtin) return builtin.label;
  const cf = template.customFields.find((c) => c.fieldKey === key);
  if (cf) return cf.label;
  const cc = template.calculatedFields.find((c) => c.fieldKey === key);
  if (cc) return cc.label;
  return key;
}
