import { prisma } from "./db";
import type { EditorStageField } from "./stages";

export type EditorOutreachRecord = {
  id: string;
  authorId: string;
  editorFirstName: string;
  editorLastName: string;
  editorEmail: string | null;
  publishingHouse: string | null;
  proposalStage: string;
  authorMeetingStage: string;
  bidStage: string;
  dealMemoStage: string;
  paymentReceivedStage: string;
  paymentSentToAuthorStage: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateEditorOutreachInput = {
  authorId: string;
  editorFirstName: string;
  editorLastName: string;
  editorEmail?: string | null;
  publishingHouse?: string | null;
};

function serialize(r: {
  id: string;
  authorId: string;
  editorFirstName: string;
  editorLastName: string;
  editorEmail: string | null;
  publishingHouse: string | null;
  proposalStage: string;
  authorMeetingStage: string;
  bidStage: string;
  dealMemoStage: string;
  paymentReceivedStage: string;
  paymentSentToAuthorStage: string;
  createdAt: Date;
  updatedAt: Date;
}): EditorOutreachRecord {
  return { ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() };
}

export async function listEditorOutreach(
  authorId: string,
): Promise<EditorOutreachRecord[]> {
  const rows = await prisma.editorOutreach.findMany({
    where: { authorId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(serialize);
}

export async function createEditorOutreach(
  input: CreateEditorOutreachInput,
): Promise<EditorOutreachRecord> {
  const row = await prisma.editorOutreach.create({
    data: {
      authorId: input.authorId,
      editorFirstName: input.editorFirstName,
      editorLastName: input.editorLastName,
      editorEmail: input.editorEmail || null,
      publishingHouse: input.publishingHouse || null,
    },
  });
  return serialize(row);
}

export async function updateEditorStage(
  outreachId: string,
  field: EditorStageField,
  value: string,
): Promise<void> {
  await prisma.editorOutreach.update({
    where: { id: outreachId },
    data: { [field]: value },
  });
}
