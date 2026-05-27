import { NextResponse } from "next/server";
import { z } from "zod";
import {
  refinePaymentEmail,
  RefineEmailError,
} from "@/lib/openai/refinePaymentEmail";

export const runtime = "nodejs";

const optionalMeta = z.string().trim().max(400).optional();

const bodySchema = z.object({
  initialEmail: z
    .string({ error: "No email to revise yet." })
    .trim()
    .min(1, "No email to revise yet.")
    .max(5000, "That email is too long to revise."),
  userInstruction: z
    .string({ error: "Tell Plato how you'd like to revise the email." })
    .trim()
    .min(1, "Tell Plato how you'd like to revise the email.")
    .max(1000, "Keep the revision instruction under 1,000 characters."),
  authorName: optionalMeta,
  title: optionalMeta,
  publisher: optionalMeta,
  editorName: optionalMeta,
  totalPayment: optionalMeta,
  authorPayment: optionalMeta,
  commissionType: optionalMeta,
});

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  try {
    const revisedEmail = await refinePaymentEmail(parsed.data);
    return NextResponse.json({ revisedEmail });
  } catch (err) {
    if (err instanceof RefineEmailError) {
      return NextResponse.json(
        { error: err.userMessage },
        { status: err.status },
      );
    }
    console.error("POST /api/payment-email/refine", err);
    return NextResponse.json(
      { error: "Plato couldn't revise the email just now. Please try again." },
      { status: 502 },
    );
  }
}
