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
