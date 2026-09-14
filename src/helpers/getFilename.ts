import mime from "mime";
import sanitize from "sanitize-filename";
import { randomUUID } from "node:crypto";

export const getFilename = (urlStr: string, headers: Headers): string => {
  const contentType = headers.get("content-type")?.split(";")[0]?.trim();
  const extension = contentType ? mime.getExtension(contentType) : null;

  let candidate = "";
  const contentDisposition = headers.get("Content-Disposition");
  if (contentDisposition) {
    const utf8Match = /filename\*=UTF-8''([^;\s]+)/i.exec(contentDisposition);
    if (utf8Match && utf8Match[1]) {
      try {
        candidate = decodeURIComponent(utf8Match[1]);
      } catch {
        // ignore malformed URI
      }
    }
    if (!candidate) {
      const match = /filename=(?:"([^"]+)"|([^;\s]+))/i.exec(contentDisposition);
      if (match) {
        candidate = match[1] || match[2] || "";
      }
    }
  }

  if (!candidate) {
    try {
      const path = new URL(urlStr).pathname;
      const lastPart = path.split("/").filter(Boolean).at(-1);
      if (lastPart) {
        candidate = decodeURIComponent(lastPart);
      }
    } catch {
      // ignore invalid URL path
    }
  }

  const sanitized = sanitize(candidate).trim().replace(/^\.+/, "");

  if (!sanitized) {
    return extension ? `${randomUUID()}.${extension}` : randomUUID();
  }

  if (!sanitized.includes(".") && extension) {
    return `${sanitized}.${extension}`;
  }

  return sanitized;
};
