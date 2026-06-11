// Plain-text sanitization for pasted or uploaded template bodies. Strips
// control characters (other than newline + tab), collapses CR/LF variations,
// normalizes whitespace at the edges, and clamps total length. No HTML, no
// embedded scripts, no rich formatting — the canvas works on plain text only.

const MAX_PLAIN_TEXT_LENGTH = 20_000; // ~7 single-spaced pages
export const MAX_UPLOAD_BYTES = 1024 * 1024; // 1 MB

const ALLOWED_EXTENSIONS = new Set([".txt", ".docx"]);
const ALLOWED_MIME_TYPES = new Set([
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // Some browsers/OSes send the generic stream type for .docx — we still
  // require the .docx extension below before accepting it.
  "application/octet-stream",
  "",
]);

// Drop control chars U+0000-U+0008, U+000B, U+000C, U+000E-U+001F, U+007F.
// Keeps tab (U+0009) and newline (U+000A). Built from a string so the source
// file stays ASCII-clean.
const CONTROL_CHARS = new RegExp(
  "[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]",
  "g",
);

export function sanitizeTemplateText(raw: string): string {
  if (typeof raw !== "string") return "";
  let text = raw
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL_CHARS, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
  text = text.trimEnd();
  if (text.length > MAX_PLAIN_TEXT_LENGTH) {
    text = text.slice(0, MAX_PLAIN_TEXT_LENGTH);
  }
  return text;
}

export type UploadValidationError = {
  ok: false;
  error: string;
};

export type UploadValidationOk = {
  ok: true;
  extension: ".txt" | ".docx";
};

export function validateUpload(
  filename: string,
  mimeType: string,
  byteLength: number,
): UploadValidationOk | UploadValidationError {
  if (byteLength > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: "That file is over 1 MB. Pick a smaller template file.",
    };
  }
  const lower = filename.toLowerCase();
  const dot = lower.lastIndexOf(".");
  const ext = dot === -1 ? "" : lower.slice(dot);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      ok: false,
      error: "Plato can import .txt or .docx files. PDFs and other formats aren't supported yet.",
    };
  }
  if (mimeType && !ALLOWED_MIME_TYPES.has(mimeType)) {
    return {
      ok: false,
      error: "Plato couldn't recognize that file's format. Try a plain .txt or .docx file.",
    };
  }
  return { ok: true, extension: ext as ".txt" | ".docx" };
}
