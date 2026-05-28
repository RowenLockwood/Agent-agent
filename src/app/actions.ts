"use server";

import { z } from "zod";
import { updateAgencyName } from "@/lib/appSettings";
import {
  createAuthor,
  deleteAuthor,
  listAuthors,
  updateAuthor,
  type AuthorRecord,
} from "@/lib/authors";
import {
  createEditorOutreach,
  deleteEditorOutreach,
  listEditorOutreach,
  updateEditorOutreach,
  updateEditorStage,
  type EditorOutreachRecord,
} from "@/lib/editorOutreach";
import {
  ContractDetailsValidationError,
  applyAuthorStageUpdate,
  applyPaymentStageUpdate,
  updateContractDetails,
  type AuthorPaymentDetailsRecord,
  type ContractDetailsPatch,
  type RenewalIntervalUnit,
} from "@/lib/paymentDetails";
import { isRenewalIntervalUnit } from "@/lib/royalties";
import {
  PAYMENT_STAGE_FIELDS,
  type AuthorStageField,
  type AuthorStages,
  type EditorStageField,
  type PaymentStageField,
} from "@/lib/stages";

// ─── Authors ──────────────────────────────────────────────────────────────────

const authorSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
  title: z.string().trim().min(1, "Book title is required."),
  genre: z.string().trim().min(1, "Genre is required."),
  email: z.string().trim().min(1, "Author email is required."),
  headAgent: z.string().trim().min(1, "Head agent is required."),
  headAgentEmail: z.string().trim().min(1, "Head agent email is required."),
  assignedAssistant: z.string().trim().min(1, "Assigned assistant is required."),
});

export type CreateAuthorResult =
  | { ok: true; author: AuthorRecord }
  | { ok: false; error: string };

export async function createAuthorAction(raw: unknown): Promise<CreateAuthorResult> {
  const parsed = authorSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  try {
    const author = await createAuthor(parsed.data);
    return { ok: true, author };
  } catch (err) {
    console.error("createAuthorAction", err);
    return { ok: false, error: "Could not save author. Check the database connection." };
  }
}

export async function updateAuthorAction(
  id: string,
  raw: unknown,
): Promise<CreateAuthorResult> {
  const parsed = authorSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  try {
    const author = await updateAuthor(id, parsed.data);
    return { ok: true, author };
  } catch (err) {
    console.error("updateAuthorAction", err);
    return { ok: false, error: "Could not update author." };
  }
}

export type DeleteResult = { ok: true } | { ok: false; error: string };

export async function deleteAuthorAction(id: string): Promise<DeleteResult> {
  try {
    await deleteAuthor(id);
    return { ok: true };
  } catch (err) {
    console.error("deleteAuthorAction", err);
    return { ok: false, error: "Could not delete author." };
  }
}

export type ListAuthorsResult =
  | { ok: true; authors: AuthorRecord[] }
  | { ok: false; error: string };

export async function listAuthorsAction(): Promise<ListAuthorsResult> {
  try {
    return { ok: true, authors: await listAuthors() };
  } catch (err) {
    console.error("listAuthorsAction", err);
    return { ok: false, error: "Could not load authors." };
  }
}

export type StageUpdateActionResult =
  | {
      ok: true;
      authorStages: AuthorStages;
      paymentDetails: AuthorPaymentDetailsRecord;
    }
  | { ok: false; error: string };

export async function updateAuthorStageAction(
  authorId: string,
  field: AuthorStageField,
  value: string,
): Promise<StageUpdateActionResult> {
  try {
    const r = await applyAuthorStageUpdate(authorId, field, value);
    return { ok: true, ...r };
  } catch (err) {
    console.error("updateAuthorStageAction", err);
    return { ok: false, error: "Could not update stage." };
  }
}

export async function updatePaymentStageAction(
  authorId: string,
  field: PaymentStageField,
  value: string,
): Promise<StageUpdateActionResult> {
  if (!PAYMENT_STAGE_FIELDS.includes(field)) {
    return { ok: false, error: "Unknown stage." };
  }
  try {
    const r = await applyPaymentStageUpdate(authorId, field, value);
    return { ok: true, ...r };
  } catch (err) {
    console.error("updatePaymentStageAction", err);
    return { ok: false, error: "Could not update stage." };
  }
}

const contractDetailsSchema = z.object({
  commissionAmount: z
    .union([z.number(), z.null()])
    .optional(),
  commissionPercentForAgency: z
    .union([z.number(), z.null()])
    .optional(),
  firstRoyaltyStatementDate: z
    .union([z.string(), z.null()])
    .optional(),
  renewalIntervalNumber: z
    .union([z.number(), z.null()])
    .optional(),
  renewalIntervalUnit: z
    .union([
      z.string().refine(isRenewalIntervalUnit, "Renewal interval unit must be Weeks or Months."),
      z.null(),
    ])
    .optional(),
  lastSentToAuthorDate: z
    .union([z.string(), z.null()])
    .optional(),
});

export type UpdateContractDetailsResult =
  | { ok: true; paymentDetails: AuthorPaymentDetailsRecord }
  | { ok: false; error: string };

export async function updateContractDetailsAction(
  authorId: string,
  raw: unknown,
): Promise<UpdateContractDetailsResult> {
  const parsed = contractDetailsSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }
  const patch: ContractDetailsPatch = {
    ...parsed.data,
    renewalIntervalUnit:
      parsed.data.renewalIntervalUnit == null
        ? parsed.data.renewalIntervalUnit
        : (parsed.data.renewalIntervalUnit as RenewalIntervalUnit),
  };
  try {
    const paymentDetails = await updateContractDetails(authorId, patch);
    return { ok: true, paymentDetails };
  } catch (err) {
    if (err instanceof ContractDetailsValidationError) {
      return { ok: false, error: err.message };
    }
    console.error("updateContractDetailsAction", err);
    return { ok: false, error: "Could not save contract details." };
  }
}

// ─── App Settings ─────────────────────────────────────────────────────────────

export type UpdateAgencyNameResult =
  | { ok: true; agencyName: string }
  | { ok: false; error: string };

export async function updateAgencyNameAction(
  value: unknown,
): Promise<UpdateAgencyNameResult> {
  if (typeof value !== "string") {
    return { ok: false, error: "Invalid input." };
  }
  try {
    const result = await updateAgencyName(value);
    return { ok: true, agencyName: result.agencyName };
  } catch (err) {
    console.error("updateAgencyNameAction", err);
    return { ok: false, error: "Could not save the agency name." };
  }
}

// ─── Editor Outreach ──────────────────────────────────────────────────────────

const editorSchema = z.object({
  editorFirstName: z.string().trim().min(1, "Editor first name is required."),
  editorLastName: z.string().trim().min(1, "Editor last name is required."),
  editorEmail: z.string().trim().min(1, "Editor email is required."),
  publishingHouse: z.string().trim().min(1, "Publishing house is required."),
});

export type CreateEditorResult =
  | { ok: true; editor: EditorOutreachRecord }
  | { ok: false; error: string };

export async function createEditorAction(
  authorId: string,
  raw: unknown,
): Promise<CreateEditorResult> {
  if (!authorId) return { ok: false, error: "Missing author." };
  const parsed = editorSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  try {
    const editor = await createEditorOutreach(authorId, parsed.data);
    return { ok: true, editor };
  } catch (err) {
    console.error("createEditorAction", err);
    return { ok: false, error: "Could not save editor." };
  }
}

export async function updateEditorAction(
  id: string,
  raw: unknown,
): Promise<CreateEditorResult> {
  const parsed = editorSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  try {
    const editor = await updateEditorOutreach(id, parsed.data);
    return { ok: true, editor };
  } catch (err) {
    console.error("updateEditorAction", err);
    return { ok: false, error: "Could not update editor." };
  }
}

export async function deleteEditorAction(id: string): Promise<DeleteResult> {
  try {
    await deleteEditorOutreach(id);
    return { ok: true };
  } catch (err) {
    console.error("deleteEditorAction", err);
    return { ok: false, error: "Could not delete editor." };
  }
}

export type ListEditorOutreachResult =
  | { ok: true; editors: EditorOutreachRecord[] }
  | { ok: false; error: string };

export async function listEditorOutreachAction(
  authorId: string,
): Promise<ListEditorOutreachResult> {
  try {
    return { ok: true, editors: await listEditorOutreach(authorId) };
  } catch (err) {
    console.error("listEditorOutreachAction", err);
    return { ok: false, error: "Could not load editors." };
  }
}

export type UpdateEditorStageResult = { ok: true } | { ok: false; error: string };

export async function updateEditorStageAction(
  outreachId: string,
  field: EditorStageField,
  value: string,
): Promise<UpdateEditorStageResult> {
  try {
    await updateEditorStage(outreachId, field, value);
    return { ok: true };
  } catch (err) {
    console.error("updateEditorStageAction", err);
    return { ok: false, error: "Could not update stage." };
  }
}
