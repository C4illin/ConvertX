import {
  ERUGO_BASE_URL,
  ERUGO_API_TOKEN,
  ERUGO_DEFAULT_EXPIRY_HOURS,
  ERUGO_CONFIGURED,
} from "./env";

/**
 * Send a local file to Erugo using Bun FormData.
 * If recipient_email is provided, Erugo will send the share link via email
 * (same behavior as Erugo UI).
 */
export async function sendFileToErugo(options: {
  fullPath: string;
  filename: string;

  shareName?: string;
  description?: string;

  recipientEmail?: string;
  recipientName?: string;

  expiryHours?: number;
}) {
  if (!ERUGO_CONFIGURED) {
    throw new Error("Erugo integration is not configured");
  }

  const {
    fullPath,
    filename,
    shareName,
    description,
    recipientEmail,
    recipientName,
    expiryHours,
  } = options;

  const url =
    `${ERUGO_BASE_URL.replace(/\/$/, "")}` +
    `/api/integrations/convertx/share`;

  const form = new FormData();

  // File
  const bunFile = Bun.file(fullPath);
  form.append("file", bunFile, filename);

  // Share name (Erugo UI uses "name")
  form.append("name", (shareName?.trim() || filename).toString());

  // Optional description
  if (description && description.trim()) {
    form.append("description", description.trim());
  }

  // Recipient (THIS is what triggers email in Erugo)
  if (recipientEmail && recipientEmail.trim()) {
    form.append("recipient_email", recipientEmail.trim());

    if (recipientName && recipientName.trim()) {
      form.append("recipient_name", recipientName.trim());
    }
  }

  // Expiry (support both variants used in different Erugo versions)
  const finalExpiry =
    typeof expiryHours === "number"
      ? expiryHours
      : ERUGO_DEFAULT_EXPIRY_HOURS;

  form.append("expires_in_hours", String(finalExpiry));
  form.append("expiry_hours", String(finalExpiry));

  // 🔍 LOG BEFORE REQUEST
  console.log("[ConvertX] Erugo upload ->", {
    url,
    filename,
    shareName,
    hasRecipient: Boolean(recipientEmail),
    recipientMasked: recipientEmail
      ? recipientEmail.replace(/(.{2}).+(@.*)/, "$1***$2")
      : null,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ERUGO_API_TOKEN}`,
      // DO NOT set Content-Type manually for FormData
    },
    body: form,
  });

  const text = await res.text();

  // 🔍 LOG RESPONSE
  console.log("[ConvertX] Erugo response <-", {
    status: res.status,
    contentType: res.headers.get("content-type"),
    bodyPreview: text.slice(0, 800),
  });

  if (!res.ok) {
    throw new Error(
      `Erugo share failed: HTTP ${res.status} – ${text.slice(0, 800)}`,
    );
  }

  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  return {
    ...json,
    share_url:
      json?.share_url ||
      json?.share_link ||
      json?.data?.url ||
      json?.data?.share?.url ||
      json?.data?.share_url ||
      json?.data?.share_link ||
      null,
  };
}

