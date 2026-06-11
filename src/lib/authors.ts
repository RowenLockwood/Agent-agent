import {
  defaultPaymentDetailsFor,
  serializePaymentDetails,
  type AuthorPaymentDetailsRecord,
} from "./paymentDetails";
import { prisma } from "./db";

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
  paymentDetails: AuthorPaymentDetailsRecord;
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

// Prisma's findMany with `include: { paymentDetails: true }` returns the
// relation as a possibly-null row. We default it client-side so the rest of
// the app can assume every AuthorRecord has a paymentDetails object.
type AuthorPaymentRow = Parameters<typeof serializePaymentDetails>[0];

function serialize(
  a: AuthorRow,
  paymentDetails: AuthorPaymentRow | null,
): AuthorRecord {
  return {
    ...a,
    paymentDetails: paymentDetails
      ? serializePaymentDetails(paymentDetails)
      : defaultPaymentDetailsFor(a.id),
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

export async function listAuthors(): Promise<AuthorRecord[]> {
  const rows = await prisma.author.findMany({
    orderBy: { createdAt: "desc" },
    include: { paymentDetails: true },
  });
  return rows.map((r) => serialize(r, r.paymentDetails));
}

export async function createAuthor(input: AuthorDetails): Promise<AuthorRecord> {
  // Author + its payment details row are created together so the dropdown
  // is consistent from day one for new authors.
  const row = await prisma.author.create({
    data: { ...input, paymentDetails: { create: {} } },
    include: { paymentDetails: true },
  });
  return serialize(row, row.paymentDetails);
}

export async function updateAuthor(
  id: string,
  input: AuthorDetails,
): Promise<AuthorRecord> {
  const row = await prisma.author.update({
    where: { id },
    data: input,
    include: { paymentDetails: true },
  });
  return serialize(row, row.paymentDetails);
}

export async function deleteAuthor(id: string): Promise<void> {
  await prisma.author.delete({ where: { id } });
}
