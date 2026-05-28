"use server";

import { z } from "zod";
import {
  createAuthor,
  deleteAuthor,
  listAuthors,
  markAuthorOnboardingSent,
  updateAuthor,
  updateAuthorStage,
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
import type { AuthorStageField, EditorStageField } from "@/lib/stages";

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

export type MarkOnboardingResult =
  | { ok: true; author: AuthorRecord; changed: boolean }
  | { ok: false; error: string };

export async function markAuthorOnboardingEmailSentAction(
  authorId: string,
): Promise<MarkOnboardingResult> {
  if (!authorId) return { ok: false, error: "Select a saved author first." };
  try {
    const { author, changed } = await markAuthorOnboardingSent(authorId);
    return { ok: true, author, changed };
  } catch (err) {
    console.error("markAuthorOnboardingEmailSentAction", err);
    return {
      ok: false,
      error: "Could not update the author's onboarding stage.",
    };
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
