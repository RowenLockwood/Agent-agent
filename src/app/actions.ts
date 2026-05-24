"use server";

import { z } from "zod";
import {
  createAuthor,
  listAuthors,
  updateAuthorStage,
  type AuthorRecord,
} from "@/lib/authors";
import {
  createEditorOutreach,
  listEditorOutreach,
  updateEditorStage,
  type EditorOutreachRecord,
} from "@/lib/editorOutreach";
import type { AuthorStageField, EditorStageField } from "@/lib/stages";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const trim = z
  .string()
  .trim()
  .transform((v) => (v.length === 0 ? null : v))
  .nullable()
  .optional();

// ─── Authors ──────────────────────────────────────────────────────────────────

const createAuthorSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
  email: trim,
  headAgent: trim,
  headAgentEmail: trim,
  assignedAssistant: trim,
});

export type CreateAuthorResult =
  | { ok: true; author: AuthorRecord }
  | { ok: false; error: string };

export async function createAuthorAction(raw: unknown): Promise<CreateAuthorResult> {
  const parsed = createAuthorSchema.safeParse(raw);
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

export type UpdateAuthorStageResult = { ok: true } | { ok: false; error: string };

export async function updateAuthorStageAction(
  authorId: string,
  field: AuthorStageField,
  value: string,
): Promise<UpdateAuthorStageResult> {
  try {
    await updateAuthorStage(authorId, field, value);
    return { ok: true };
  } catch (err) {
    console.error("updateAuthorStageAction", err);
    return { ok: false, error: "Could not update stage." };
  }
}

// ─── Editor Outreach ──────────────────────────────────────────────────────────

const createEditorSchema = z.object({
  authorId: z.string().min(1),
  editorFirstName: z.string().trim().min(1, "Editor first name is required."),
  editorLastName: z.string().trim().min(1, "Editor last name is required."),
  editorEmail: trim,
  publishingHouse: trim,
});

export type CreateEditorResult =
  | { ok: true; editor: EditorOutreachRecord }
  | { ok: false; error: string };

export async function createEditorAction(raw: unknown): Promise<CreateEditorResult> {
  const parsed = createEditorSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  try {
    const editor = await createEditorOutreach(parsed.data);
    return { ok: true, editor };
  } catch (err) {
    console.error("createEditorAction", err);
    return { ok: false, error: "Could not save editor." };
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
