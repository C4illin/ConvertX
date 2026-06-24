import { IStorageAdapter } from "./index";
import { promises as fs } from "fs";
import path from "path";

export class LocalStorageAdapter implements IStorageAdapter {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  async save(key: string, data: Buffer): Promise<string> {
    const fullPath = path.join(this.baseDir, key);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, data);
    return key;
  }

  async get(key: string): Promise<Buffer> {
    const fullPath = path.join(this.baseDir, key);
    return fs.readFile(fullPath);
  }

  async delete(key: string): Promise<void> {
    const fullPath = path.join(this.baseDir, key);
    try {
      await fs.unlink(fullPath);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err?.code === "ENOENT" || err?.code === "ENOTDIR") {
        return;
      }

      console.error(`Failed to delete file at ${fullPath}: `, error);
      throw error;
    }
  }

  getStream(key: string): ReadableStream<Uint8Array> {
    const fullPath = path.join(this.baseDir, key);
    const file = Bun.file(fullPath);
    return file.stream();
  }
}
