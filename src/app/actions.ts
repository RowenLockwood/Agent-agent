"use server";

import { z } from "zod";
import {
  type AuthorRecord,
  createAuthor as createAuthorRecord,
  listAuthors,
} from "@/lib/authors";

const trimmedOrNull = z
  .string()
  .trim()
  .transform((v) => (v.length === 0 ? null : v))
  .nullable()
  .optional();

const createAuthorSchema = z.object({
  name: z.string().trim().min(1, "Author name is required."),
  email: trimmedOrNull,
  headAgent: trimmedOrNull,
  title: trimmedOrNull,
  editor: trimmedOrNull,
  publisher: trimmedOrNull,
});

export type CreateAuthorResult =
  | { ok: true; author: AuthorRecord }
  | { ok: false; error: string };

export async function createAuthorAction(
  raw: unknown,
): Promise<CreateAuthorResult> {
  const parsed = createAuthorSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Invalid input." };
  }

  try {
    const author = await createAuthorRecord(parsed.data);
    return { ok: true, author };
  } catch (err) {
    console.error("createAuthorAction failed", err);
    return {
      ok: false,
      error: "Could not save author. Check the database connection.",
    };
  }
}

export type ListAuthorsResult =
  | { ok: true; authors: AuthorRecord[] }
  | { ok: false; error: string };

export async function listAuthorsAction(): Promise<ListAuthorsResult> {
  try {
    const authors = await listAuthors();
    return { ok: true, authors };
  } catch (err) {
    console.error("listAuthorsAction failed", err);
    return {
      ok: false,
      error: "Could not load authors.",
    };
  }
}
