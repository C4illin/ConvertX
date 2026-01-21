import { LocalStorageAdapter } from "./LocalStorageAdapter";
import { S3StorageAdapter } from "./S3StorageAdapter";

export interface IStorageAdapter {
    save(key: string, data: Buffer): Promise<string>;
    get(key: string): Promise<Buffer>;
    delete(key: string): Promise<void>;
}

export function getStorage(): IStorageAdapter {
    if (process.env.STORAGE_BACKEND === "s3") {
        if (!process.env.S3_BUCKET) {
            throw new Error("S3_BUCKET must be set when STORAGE_BACKEND=s3");
        }

        return new S3StorageAdapter(process.env.S3_BUCKET);
    }
    
    return new LocalStorageAdapter("./data");
}