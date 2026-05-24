import { prisma } from "./db";
import type { AuthorStageField } from "./stages";

export type AuthorRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  headAgent: string | null;
  headAgentEmail: string | null;
  assignedAssistant: string | null;
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

export type CreateAuthorInput = {
  firstName: string;
  lastName: string;
  email?: string | null;
  headAgent?: string | null;
  headAgentEmail?: string | null;
  assignedAssistant?: string | null;
};

function serialize(a: {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  headAgent: string | null;
  headAgentEmail: string | null;
  assignedAssistant: string | null;
  proposalSentToEditors: string;
  authorMeetings: string;
  bidSent: string;
  dealMemoSent: string;
  dealMemoAccepted: string;
  paymentReceived: string;
  paymentSentToAuthor: string;
  createdAt: Date;
  updatedAt: Date;
}): AuthorRecord {
  return { ...a, createdAt: a.createdAt.toISOString(), updatedAt: a.updatedAt.toISOString() };
}

export async function listAuthors(): Promise<AuthorRecord[]> {
  const rows = await prisma.author.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(serialize);
}

export async function createAuthor(input: CreateAuthorInput): Promise<AuthorRecord> {
  const row = await prisma.author.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email || null,
      headAgent: input.headAgent || null,
      headAgentEmail: input.headAgentEmail || null,
      assignedAssistant: input.assignedAssistant || null,
    },
  });
  return serialize(row);
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
