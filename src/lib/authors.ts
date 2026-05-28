import { prisma } from "./db";
import type { AuthorStageField } from "./stages";

export type AuthorRecord = {
  id: string;
  firstName: string;
  lastName: string;
  title: string;
  genre: string;
  email: string;
  headAgent: string;
  headAgentEmail: string;
  assignedAssistant: string;
  authorOnboarded: string;
  proposalSentToEditors: string;
  authorMeetings: string;
  bidSent: string;
  dealMemoSent: string;
  dealMemoAccepted: string;
  paymentReceived: string;
  paymentSentToAuthor: string;
  createdAt: string;
  updatedAt: string;
};

export type AuthorDetails = {
  firstName: string;
  lastName: string;
  title: string;
  genre: string;
  email: string;
  headAgent: string;
  headAgentEmail: string;
  assignedAssistant: string;
};

type AuthorRow = {
  id: string;
  firstName: string;
  lastName: string;
  title: string;
  genre: string;
  email: string;
  headAgent: string;
  headAgentEmail: string;
  assignedAssistant: string;
  authorOnboarded: string;
  proposalSentToEditors: string;
  authorMeetings: string;
  bidSent: string;
  dealMemoSent: string;
  dealMemoAccepted: string;
  paymentReceived: string;
  paymentSentToAuthor: string;
  createdAt: Date;
  updatedAt: Date;
};

function serialize(a: AuthorRow): AuthorRecord {
  return { ...a, createdAt: a.createdAt.toISOString(), updatedAt: a.updatedAt.toISOString() };
}

export async function listAuthors(): Promise<AuthorRecord[]> {
  const rows = await prisma.author.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(serialize);
}

export async function createAuthor(input: AuthorDetails): Promise<AuthorRecord> {
  const row = await prisma.author.create({ data: input });
  return serialize(row);
}

export async function updateAuthor(
  id: string,
  input: AuthorDetails,
): Promise<AuthorRecord> {
  const row = await prisma.author.update({ where: { id }, data: input });
  return serialize(row);
}

export async function deleteAuthor(id: string): Promise<void> {
  await prisma.author.delete({ where: { id } });
}

export async function updateAuthorStage(
  authorId: string,
  field: AuthorStageField,
  value: string,
): Promise<void> {
  await prisma.author.update({
    where: { id: authorId },
    data: { [field]: value },
  });
}

/**
 * Advance an author's onboarding stage when their agreement email is sent.
 * Only promotes "not_started" → "in_progress"; never overwrites "in_progress"
 * or "completed". The conditional `updateMany` makes the no-downgrade rule
 * atomic. Returns the current record and whether anything changed.
 */
export async function markAuthorOnboardingSent(
  id: string,
): Promise<{ author: AuthorRecord; changed: boolean }> {
  const res = await prisma.author.updateMany({
    where: { id, authorOnboarded: "not_started" },
    data: { authorOnboarded: "in_progress" },
  });
  const row = await prisma.author.findUnique({ where: { id } });
  if (!row) throw new Error("Author not found.");
  return { author: serialize(row), changed: res.count > 0 };
}
