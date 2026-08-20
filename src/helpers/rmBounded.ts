import { lstatSync, readdirSync, rmdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";

export type RmFs = {
  lstatSync: (path: string) => { isDirectory(): boolean };
  readdirSync: (path: string) => string[];
  unlinkSync: (path: string) => void;
  rmdirSync: (path: string) => void;
};

const defaultFs: RmFs = {
  lstatSync,
  readdirSync,
  unlinkSync,
  rmdirSync,
};

const DEFAULT_MAX_RETRIES = 3;

function errorCode(err: unknown): string | undefined {
  if (err && typeof err === "object" && "code" in err && typeof err.code === "string") {
    return err.code;
  }
  return undefined;
}

export function rmBounded(
  targetPath: string,
  options: { maxRetries?: number } = {},
  fsImpl: RmFs = defaultFs,
): void {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  try {
    rmPath(targetPath, maxRetries, fsImpl);
  } catch (err) {
    if (errorCode(err) === "ENOENT") {
      return;
    }
    throw err;
  }
}

function rmPath(targetPath: string, retriesLeft: number, fsImpl: RmFs): void {
  let stat: { isDirectory(): boolean };
  try {
    stat = fsImpl.lstatSync(targetPath);
  } catch (err) {
    if (errorCode(err) === "ENOENT") {
      return;
    }
    throw err;
  }

  if (!stat.isDirectory()) {
    fsImpl.unlinkSync(targetPath);
    return;
  }

  rmDirectory(targetPath, retriesLeft, fsImpl);
}

function rmDirectory(targetPath: string, retriesLeft: number, fsImpl: RmFs): void {
  let entries: string[];
  try {
    entries = fsImpl.readdirSync(targetPath);
  } catch (err) {
    if (errorCode(err) === "ENOENT") {
      return;
    }
    throw err;
  }

  for (const entry of entries) {
    rmPath(join(targetPath, entry), retriesLeft, fsImpl);
  }

  try {
    fsImpl.rmdirSync(targetPath);
  } catch (err) {
    if (errorCode(err) === "ENOENT") {
      return;
    }
    if (errorCode(err) === "ENOTEMPTY" && retriesLeft > 0) {
      rmDirectory(targetPath, retriesLeft - 1, fsImpl);
      return;
    }
    throw err;
  }
}
