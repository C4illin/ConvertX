import { access, readdir } from "node:fs/promises";
import path from "node:path";

import sanitize from "sanitize-filename";

const isMissingPathError = (error: unknown): boolean => {
  const code = (error as NodeJS.ErrnoException | null)?.code;
  return code === "ENOENT" || code === "ENOTDIR";
};

async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch (error) {
    if (isMissingPathError(error)) {
      return false;
    }
    throw error;
  }
}

/**
 * Normalize Unicode to NFC before sanitizing so decomposed (NFD, e.g. macOS)
 * and precomposed (NFC) forms truncate and map identically.
 */
export const sanitizeFileName = (fileName: string): string => sanitize(fileName.normalize("NFC"));

/**
 * Resolve sanitized filenames inside `dir` in batch, preserving exact matches when both NFC and
 * NFD forms coexist and scanning `dir` at most once for Unicode-equivalent entries.
 */
export const resolveStoredFileNames = async (
  dir: string,
  fileNames: string[],
): Promise<string[]> => {
  const exactNames = fileNames.map((name) => sanitize(name));
  const canonicalNames = fileNames.map((name) => sanitizeFileName(name));
  const resolved = new Array<string>(fileNames.length);
  const unresolvedIndices: number[] = [];

  await Promise.all(
    fileNames.map(async (_, i) => {
      const exact = exactNames[i] ?? "";
      const canonical = canonicalNames[i] ?? "";
      if (canonical === "") {
        resolved[i] = canonical;
        return;
      }
      if (exact !== "" && (await fileExists(path.join(dir, exact)))) {
        resolved[i] = exact;
        return;
      }
      if (canonical !== exact && (await fileExists(path.join(dir, canonical)))) {
        resolved[i] = canonical;
        return;
      }
      unresolvedIndices.push(i);
    }),
  );

  if (unresolvedIndices.length === 0) {
    return resolved;
  }

  const nfcIndex = new Map<string, string>();
  try {
    for (const entry of await readdir(dir)) {
      const normalized = entry.normalize("NFC");
      if (!nfcIndex.has(normalized)) {
        nfcIndex.set(normalized, entry);
      }
    }
  } catch (error) {
    if (!isMissingPathError(error)) {
      throw error;
    }
    // Directory may not exist yet; let the caller handle ENOENT/404.
  }

  for (const i of unresolvedIndices) {
    const canonical = canonicalNames[i] ?? "";
    resolved[i] = nfcIndex.get(canonical) ?? canonical;
  }

  return resolved;
};

/**
 * Resolve a single filename inside `dir` against exact and NFC-equivalent entries.
 */
export const resolveStoredFileName = async (dir: string, fileName: string): Promise<string> =>
  (await resolveStoredFileNames(dir, [fileName]))[0] ?? sanitizeFileName(fileName);
