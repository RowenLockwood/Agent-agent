import type { EmailType } from "./openai/refineEmail";

export type RefineEmailRequest = {
  emailType: EmailType;
  initialEmail: string;
  userInstruction: string;
  authorName?: string;
  title?: string;
  publisher?: string;
  editorName?: string;
  totalPayment?: string;
  authorPayment?: string;
  commissionType?: string;
  agency?: string;
  agentName?: string;
};

export type RefineEmailResult =
  | { ok: true; revisedEmail: string }
  | { ok: false; error: string };

/**
 * Client-side wrapper around `POST /api/email/refine`. Resolves to a tagged
 * result instead of throwing so callers can render a tidy error state. The
 * OpenAI key stays server-side; this only ever talks to our own route.
 */
export async function requestEmailRefinement(
  body: RefineEmailRequest,
): Promise<RefineEmailResult> {
  let res: Response;
  try {
    res = await fetch("/api/email/refine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return {
      ok: false,
      error:
        "Plato couldn't reach the editor. Check your connection and try again.",
    };
  }

  const data: unknown = await res.json().catch(() => null);
  const revised =
    data && typeof data === "object" && "revisedEmail" in data
      ? (data as { revisedEmail?: unknown }).revisedEmail
      : undefined;

  if (!res.ok || typeof revised !== "string" || !revised.trim()) {
    const message =
      data && typeof data === "object" && "error" in data
        ? (data as { error?: unknown }).error
        : undefined;
    return {
      ok: false,
      error:
        typeof message === "string"
          ? message
          : "Plato couldn't revise the email. Please try again.",
    };
  }

  return { ok: true, revisedEmail: revised.trim() };
}
