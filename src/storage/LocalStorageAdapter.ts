import { IStorageAdapter } from "./index";
import { promises as fs } from "fs";
import path from "path";

export class LocalStorageAdapter implements IStorageAdapter {
    baseDir: string;

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
        await fs.unlink(fullPath);
    }
}