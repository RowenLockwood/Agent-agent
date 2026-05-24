import { prisma } from "./db";

export type AuthorRecord = {
  id: string;
  name: string;
  email: string | null;
  headAgent: string | null;
  title: string | null;
  editor: string | null;
  publisher: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthorInput = {
  name: string;
  email?: string | null;
  headAgent?: string | null;
  title?: string | null;
  editor?: string | null;
  publisher?: string | null;
};

function serialize(a: {
  id: string;
  name: string;
  email: string | null;
  headAgent: string | null;
  title: string | null;
  editor: string | null;
  publisher: string | null;
  createdAt: Date;
  updatedAt: Date;
}): AuthorRecord {
  return {
    ...a,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

export async function listAuthors(): Promise<AuthorRecord[]> {
  const rows = await prisma.author.findMany({
    orderBy: { createdAt: "desc" },
  });
  return rows.map(serialize);
}

export async function createAuthor(input: AuthorInput): Promise<AuthorRecord> {
  const row = await prisma.author.create({
    data: {
      name: input.name,
      email: input.email || null,
      headAgent: input.headAgent || null,
      title: input.title || null,
      editor: input.editor || null,
      publisher: input.publisher || null,
    },
  });
  return serialize(row);
}
