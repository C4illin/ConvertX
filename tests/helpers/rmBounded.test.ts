import { afterEach, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { rmBounded, type RmFs } from "../../src/helpers/rmBounded";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    try {
      rmBounded(dir, { maxRetries: 2 });
    } catch {
      // test cleanup best-effort
    }
  }
});

function errno(code: string, message = code): NodeJS.ErrnoException {
  const err = new Error(message) as NodeJS.ErrnoException;
  err.code = code;
  return err;
}

/**
 * FUSE (shfs/sshfs/mergerfs) keeps a directory entry for an unlinked file
 * that still has an open fd by renaming it to `.fuse_hidden<hex>` on every
 * unlink. An unbounded recursive rm then never converges.
 */
function createFuseHiddenFs(root: string, leakedFile: string): RmFs & { unlinks: number } {
  const files = new Set<string>([leakedFile]);
  let hiddenSeq = 0;
  const fsImpl: RmFs & { unlinks: number } = {
    unlinks: 0,
    lstatSync(path: string) {
      if (path === root) {
        return { isDirectory: () => true };
      }
      const name = basename(path);
      if (!files.has(name)) {
        throw errno("ENOENT", `ENOENT: ${path}`);
      }
      return { isDirectory: () => false };
    },
    readdirSync(path: string) {
      if (path !== root) {
        throw errno("ENOTDIR", `ENOTDIR: ${path}`);
      }
      return [...files];
    },
    unlinkSync(path: string) {
      fsImpl.unlinks += 1;
      if (fsImpl.unlinks > 200) {
        throw new Error("unbounded unlink loop");
      }
      const name = basename(path);
      files.delete(name);
      files.add(`.fuse_hidden${hiddenSeq.toString(16).padStart(16, "0")}`);
      hiddenSeq += 1;
    },
    rmdirSync(path: string) {
      if (path !== root) {
        throw errno("ENOENT", `ENOENT: ${path}`);
      }
      if (files.size > 0) {
        throw errno("ENOTEMPTY", "ENOTEMPTY: directory not empty");
      }
    },
  };
  return fsImpl;
}

test("rmBounded gives up when FUSE recreates .fuse_hidden entries after unlink", () => {
  const root = "/app/data/output/1/9";
  const fsImpl = createFuseHiddenFs(root, "clip.h264.mp4");

  let thrown: unknown;
  try {
    rmBounded(root, { maxRetries: 2 }, fsImpl);
  } catch (err) {
    thrown = err;
  }

  expect(thrown).toBeDefined();
  expect((thrown as Error).message).not.toBe("unbounded unlink loop");
  expect((thrown as NodeJS.ErrnoException).code).toBe("ENOTEMPTY");
  expect(fsImpl.unlinks).toBeGreaterThan(0);
  expect(fsImpl.unlinks).toBeLessThanOrEqual(6);
});

test("rmBounded removes a real directory tree", () => {
  const root = mkdtempSync(join(tmpdir(), "convertx-rm-"));
  tempDirs.push(root);
  mkdirSync(join(root, "nested"));
  writeFileSync(join(root, "a.txt"), "a");
  writeFileSync(join(root, "nested", "b.txt"), "b");

  rmBounded(root);

  expect(existsSync(root)).toBe(false);
});

test("rmBounded with force ignores a missing path", () => {
  expect(() => rmBounded(join(tmpdir(), "convertx-missing-" + Date.now()))).not.toThrow();
});
