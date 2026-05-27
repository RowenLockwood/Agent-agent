import OpenAI from "openai";

export type RefinePaymentEmailInput = {
  initialEmail: string;
  userInstruction: string;
  authorName?: string;
  title?: string;
  publisher?: string;
  editorName?: string;
  totalPayment?: string;
  authorPayment?: string;
  commissionType?: string;
};

/**
 * Error whose `userMessage` is safe to surface to the client. Anything thrown
 * that is NOT a RefineEmailError must be treated as opaque by the caller.
 */
export class RefineEmailError extends Error {
  readonly status: number;
  constructor(userMessage: string, status = 502) {
    super(userMessage);
    this.name = "RefineEmailError";
    this.status = status;
  }
  get userMessage(): string {
    return this.message;
  }
}

const DEFAULT_MODEL = "gpt-5.5";

// Generous cap: an email revision is small, but "high" reasoning effort spends
// output budget on hidden reasoning tokens before the visible email.
const MAX_OUTPUT_TOKENS = 8000;

const SYSTEM_INSTRUCTION = [
  "You are helping a literary agent adjust an email, likely to an external author, about their payment.",
  "Return only the adjusted email.",
  "Do not include commentary, explanations, markdown fences, subject lines, or notes.",
  "Preserve the factual payment details unless the user explicitly asks to change wording around them.",
  "Maintain a professional, clear, warm literary-agency tone.",
  "Do not invent new payment amounts, publishers, titles, editors, or author details.",
  "If the user asks for a tone change, keep every payment fact intact.",
  "If the user asks to change a factual detail, treat it strictly as a wording revision and never recalculate or fabricate values.",
].join(" ");

function buildInput(input: RefinePaymentEmailInput): string {
  const meta: string[] = [];
  const add = (label: string, value?: string) => {
    const v = value?.trim();
    if (v) meta.push(`  ${label}: ${v}`);
  };
  add("Author", input.authorName);
  add("Title", input.title);
  add("Publisher", input.publisher);
  add("Editor Name", input.editorName);
  add("Total Payment", input.totalPayment);
  add("Author Payment After Commission", input.authorPayment);
  add("Commission Type", input.commissionType);

  const parts = [
    "- Original email:",
    input.initialEmail.trim(),
    "",
    "- User revision request:",
    input.userInstruction.trim(),
  ];
  if (meta.length > 0) {
    parts.push("", "- Available payment metadata:", ...meta);
  }
  parts.push("", "Return only the revised email.");
  return parts.join("\n");
}

/** Trim and strip a single wrapping code fence; otherwise leave content intact. */
function sanitizeEmail(raw: string): string {
  let text = raw.trim();
  const fenced = text.match(/^```[a-zA-Z]*\n([\s\S]*?)\n?```$/);
  if (fenced) text = fenced[1].trim();
  return text;
}

function toRefineError(err: unknown): RefineEmailError {
  if (err instanceof OpenAI.APIError) {
    const status = err.status ?? 0;
    if (status === 401 || status === 403) {
      return new RefineEmailError(
        "Plato couldn't authenticate with OpenAI. Check the server's OPENAI_API_KEY.",
        502,
      );
    }
    if (status === 404 || err.code === "model_not_found") {
      return new RefineEmailError(
        "The configured model isn't available. Set OPENAI_MODEL to a model your OpenAI account can use.",
        502,
      );
    }
    if (status === 429) {
      return new RefineEmailError(
        "OpenAI is busy right now. Wait a moment and try again.",
        503,
      );
    }
  }
  // Opaque failure — log the detail server-side, never leak it to the client.
  console.error("refinePaymentEmail", err);
  return new RefineEmailError(
    "Plato couldn't reach the email editor. Please try again.",
    502,
  );
}

/**
 * Revise a generated payment email via the OpenAI Responses API. Server-side
 * only — the API key never leaves this module's process.
 */
export async function refinePaymentEmail(
  input: RefinePaymentEmailInput,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new RefineEmailError(
      "Plato's email editor isn't configured yet. Add an OpenAI API key to enable revisions.",
      503,
    );
  }

  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;
  const client = new OpenAI({ apiKey });

  let response;
  try {
    response = await client.responses.create({
      model,
      reasoning: { effort: "high" },
      instructions: SYSTEM_INSTRUCTION,
      input: buildInput(input),
      max_output_tokens: MAX_OUTPUT_TOKENS,
    });
  } catch (err) {
    throw toRefineError(err);
  }

  if (response.status === "incomplete") {
    throw new RefineEmailError(
      "The revision was cut off before finishing. Try a shorter instruction or email.",
      502,
    );
  }

  const revised = sanitizeEmail(response.output_text ?? "");
  if (!revised) {
    throw new RefineEmailError(
      "Plato received an empty revision. Please try again.",
      502,
    );
  }
  return revised;
}
