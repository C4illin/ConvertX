import { s3, S3File } from "bun";
import { IStorageAdapter } from "./index";

export class S3StorageAdapter implements IStorageAdapter {
    private bucket: string;

    constructor(bucket: string) {
        this.bucket = bucket;
    }

    async save(key: string, data: Buffer): Promise<string> {
        const file: S3File = s3.file(key, {
            bucket: this.bucket,
            acl: "private",
        });
        
        await file.write(data);
        return key;
    }

    async get(key: string): Promise<Buffer> {
        const file: S3File = s3.file(key, {
            bucket: this.bucket,
        });

        return Buffer.from(await file.bytes());
    }

    async delete(key: string): Promise<void> {
        const file: S3File = s3.file(key, {
            bucket: this.bucket,
        })

        await file.delete();
    }
}