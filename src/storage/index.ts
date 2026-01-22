import { LocalStorageAdapter } from "./LocalStorageAdapter";
import { S3StorageAdapter } from "./S3StorageAdapter";

export interface IStorageAdapter {
    save(key: string, data: Buffer): Promise<string>;
    get(key: string): Promise<Buffer>;
    delete(key: string): Promise<void>;
    getStream(key: string): ReadableStream<Uint8Array>;
}

export function getStorageType(): "local" | "s3" {
    return process.env.STORAGE_TYPE === "s3" ? "s3" : "local";
}

export function getStorage(): IStorageAdapter {
    if (getStorageType() === "s3") {
        const bucket = process.env.S3_BUCKET_NAME;
        if (!bucket) {
            throw new Error("S3_BUCKET_NAME must be set when STORAGE_TYPE=s3");
        }

        return new S3StorageAdapter(bucket);
    }
    
    const baseDir = process.env.LOCAL_STORAGE_PATH || "./data/storage";
    return new LocalStorageAdapter(baseDir);
}