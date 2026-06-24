import { s3, S3File } from "bun";
import { IStorageAdapter } from "./index";

export class S3StorageAdapter implements IStorageAdapter {
  private bucket: string;

  constructor(bucket: string) {
    this.bucket = bucket;
  }

  async save(key: string, data: Buffer): Promise<string> {
    const opts: Record<string, unknown> = {
      bucket: this.bucket,
    };

    if (process.env.S3_USE_ACL === "true") {
      const aclValue = process.env.S3_ACL_VALUE || "private";
      opts.acl = aclValue;
    }

    const file: S3File = s3.file(key, opts);

    await file.write(data);
    return key;
  }

  async get(key: string): Promise<Buffer> {
    const file: S3File = s3.file(key, {
      bucket: this.bucket,
    });

    const buf = await file.bytes();
    return Buffer.from(buf);
  }

  async delete(key: string): Promise<void> {
    const file: S3File = s3.file(key, {
      bucket: this.bucket,
    });

    await file.delete();
  }

  getStream(key: string): ReadableStream<Uint8Array> {
    const file: S3File = s3.file(key, {
      bucket: this.bucket,
    });
    return file.stream();
  }
}
