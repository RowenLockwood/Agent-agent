import { prisma } from "./db";
import type { EditorStageField } from "./stages";

export type EditorOutreachRecord = {
  id: string;
  authorId: string;
  editorFirstName: string;
  editorLastName: string;
  editorEmail: string;
  publishingHouse: string;
  proposalStage: string;
  authorMeetingStage: string;
  bidStage: string;
  dealMemoStage: string;
  paymentReceivedStage: string;
  paymentSentToAuthorStage: string;
  createdAt: string;
  updatedAt: string;
};

export type EditorDetails = {
  editorFirstName: string;
  editorLastName: string;
  editorEmail: string;
  publishingHouse: string;
};

type EditorRow = {
  id: string;
  authorId: string;
  editorFirstName: string;
  editorLastName: string;
  editorEmail: string;
  publishingHouse: string;
  proposalStage: string;
  authorMeetingStage: string;
  bidStage: string;
  dealMemoStage: string;
  paymentReceivedStage: string;
  paymentSentToAuthorStage: string;
  createdAt: Date;
  updatedAt: Date;
};

function serialize(r: EditorRow): EditorOutreachRecord {
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
  authorId: string,
  input: EditorDetails,
): Promise<EditorOutreachRecord> {
  const row = await prisma.editorOutreach.create({
    data: { authorId, ...input },
  });
  return serialize(row);
}

export async function updateEditorOutreach(
  id: string,
  input: EditorDetails,
): Promise<EditorOutreachRecord> {
  const row = await prisma.editorOutreach.update({ where: { id }, data: input });
  return serialize(row);
}

export async function deleteEditorOutreach(id: string): Promise<void> {
  await prisma.editorOutreach.delete({ where: { id } });
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
