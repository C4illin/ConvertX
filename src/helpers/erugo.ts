import {
  ERUGO_API_TOKEN,
  ERUGO_BASE_URL,
  ERUGO_CONFIGURED,
  ERUGO_DEFAULT_EXPIRY_HOURS,
} from "./env";

export type ErugoShareOptions = {
  fullPath: string;
  filename: string;
  /**
   * Name shown in Erugo UI. If not provided, defaults to filename.
   */
  shareName?: string;
  /**
   * Optional email of the recipient to notify.
   */
  recipientEmail?: string;
  /**
   * Optional description / message.
   */
  description?: string;
  /**
   * Optional expiry in hours. Defaults to ERUGO_DEFAULT_EXPIRY_HOURS.
   */
  expiryHours?: number;
};

export type ErugoShareResponse = Record<string, unknown> & {
  share_url: string | null;
};

function ensureConfigured() {
  if (!ERUGO_CONFIGURED) {
    throw new Error(
      "Erugo is not configured. Set ERUGO_BASE_URL and ERUGO_API_TOKEN.",
    );
  }
}

function getRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getNested(obj: unknown, path: string[]): unknown {
  let cur: unknown = obj;
  for (const key of path) {
    const rec = getRecord(cur);
    if (!rec) return undefined;
    cur = rec[key];
  }
  return cur;
}

function pickFirstString(values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === "string" && v.trim().length > 0) return v;
  }
  return null;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

/**
 * Sends a file to Erugo and returns a normalized response that always includes `share_url`.
 */
export async function sendFileToErugo(
  options: ErugoShareOptions,
): Promise<ErugoShareResponse> {
  ensureConfigured();

  const {
    fullPath,
    filename,
    shareName,
    recipientEmail,
    description,
    expiryHours,
  } = options;

  const base = ERUGO_BASE_URL.replace(/\/$/, "");
  const url = `${base}/api/integrations/convertx/share`;

  const form = new FormData();

  // File
  const bunFile = Bun.file(fullPath);
  form.append("file", bunFile, filename);

  // Name
  form.append("name", (shareName?.trim() || filename).toString());

  // Recipient email (if supported by Erugo)
  if (recipientEmail && recipientEmail.trim().length > 0) {
    // Some Erugo versions may expect "email" or "recipient_email".
    // Include both to maximize compatibility.
    form.append("email", recipientEmail.trim());
    form.append("recipient_email", recipientEmail.trim());
  }

  // Description / message
  if (description && description.trim().length > 0) {
    form.append("description", description.trim());
    form.append("message", description.trim());
  }

  // Expiry
  const finalExpiry =
    typeof expiryHours === "number" && Number.isFinite(expiryHours)
      ? expiryHours
      : ERUGO_DEFAULT_EXPIRY_HOURS;

  // Support multiple field names across Erugo versions
  form.append("expires_in_hours", String(finalExpiry));
  form.append("expiry_hours", String(finalExpiry));

  // Log request
  console.log("[ConvertX] Erugo upload ->", {
    url,
    filename,
    shareName: shareName?.trim() || filename,
    hasRecipient: Boolean(recipientEmail && recipientEmail.trim().length > 0),
    hasDescription: Boolean(description && description.trim().length > 0),
    expiryHours: finalExpiry,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ERUGO_API_TOKEN}`,
    },
    body: form,
  });

  const text = await res.text();

  // Log response
  console.log("[ConvertX] Erugo response <-", {
    status: res.status,
    contentType: res.headers.get("content-type"),
    bodyPreview: text.slice(0, 800),
  });

  if (!res.ok) {
    throw new Error(`Erugo share failed: HTTP ${res.status} – ${text.slice(0, 800)}`);
  }

  const parsed = safeJsonParse(text);
  const rec = getRecord(parsed) ?? { value: parsed };

  const share_url = pickFirstString([
    // common direct fields
    getNested(rec, ["share_url"]),
    getNested(rec, ["share_link"]),
    getNested(rec, ["url"]),
    // nested patterns
    getNested(rec, ["data", "url"]),
    getNested(rec, ["data", "share", "url"]),
    getNested(rec, ["data", "share_url"]),
    getNested(rec, ["data", "share_link"]),
  ]);

  return {
    ...rec,
    share_url,
  };
}
