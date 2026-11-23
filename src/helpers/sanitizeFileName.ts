import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

import sanitize from "sanitize-filename";

/**
 * Sanitize a client-supplied filename and normalize Unicode to NFC so decomposed (NFD, e.g. macOS)
 * and precomposed (NFC) forms map identically.
 */
export const sanitizeFileName = (fileName: string): string => sanitize(fileName).normalize("NFC");

/**
 * Resolve a sanitized filename inside `dir`, falling back to a Unicode NFC-equivalent entry on disk
 * when the filesystem uses a different form.
 */
export const resolveStoredFileName = (dir: string, fileName: string): string => {
  const sanitized = sanitizeFileName(fileName);
  if (sanitized === "") {
    return sanitized;
  }
  if (existsSync(path.join(dir, sanitized))) {
    return sanitized;
  }
  try {
    for (const entry of readdirSync(dir)) {
      if (entry.normalize("NFC") === sanitized) {
        return entry;
      }
    }
  } catch {
    // Directory may not exist yet; let the caller handle ENOENT/404.
  }
  return sanitized;
};
