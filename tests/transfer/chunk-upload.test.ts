/**
 * Contents.CN Chunk 上傳整合測試
 *
 * 測試大檔 chunk 上傳的完整流程
 */

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { mkdirSync, existsSync, rmSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { handleChunkUpload, calculateChunkCount } from "../../src/transfer/uploadManager";
import { CHUNK_SIZE_BYTES } from "../../src/transfer/constants";

const testDir = "./test-output-chunk-upload";

describe("Chunk 上傳整合測試", () => {
  beforeEach(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  test("多 chunk 上傳應正確合併", async () => {
    const uploadId = "test-chunked-upload-1";
    const fileName = "large-file.bin";
    const userId = "test-user";
    const jobId = "test-job";

    // 建立測試資料（模擬 15MB 檔案，分 3 個 chunks）
    const chunkSize = 5 * 1024; // 使用較小的 chunk 以便測試
    const chunk1 = Buffer.alloc(chunkSize, "A");
    const chunk2 = Buffer.alloc(chunkSize, "B");
    const chunk3 = Buffer.alloc(chunkSize, "C");
    const totalSize = chunkSize * 3;
    const totalChunks = 3;

    const baseTempDir = join(testDir, "temp");
    const targetDir = join(testDir, "uploads");
    mkdirSync(baseTempDir, { recursive: true });
    mkdirSync(targetDir, { recursive: true });

    // 上傳 chunk 1
    const result1 = await handleChunkUpload(
      uploadId,
      0,
      totalChunks,
      chunk1,
      fileName,
      totalSize,
      userId,
      jobId,
      baseTempDir,
      targetDir,
    );
    expect(result1.success).toBe(true);
    expect(result1.completed).toBe(false);
    expect(result1.received_chunks).toContain(0);

    // 上傳 chunk 2
    const result2 = await handleChunkUpload(
      uploadId,
      1,
      totalChunks,
      chunk2,
      fileName,
      totalSize,
      userId,
      jobId,
      baseTempDir,
      targetDir,
    );
    expect(result2.success).toBe(true);
    expect(result2.completed).toBe(false);

    // 上傳 chunk 3（最後一個）
    const result3 = await handleChunkUpload(
      uploadId,
      2,
      totalChunks,
      chunk3,
      fileName,
      totalSize,
      userId,
      jobId,
      baseTempDir,
      targetDir,
    );
    expect(result3.success).toBe(true);
    expect(result3.completed).toBe(true);
    expect(result3.file_path).toBeDefined();

    // 驗證合併後的檔案
    const mergedFile = join(targetDir, fileName);
    expect(existsSync(mergedFile)).toBe(true);

    const mergedContent = readFileSync(mergedFile);
    expect(mergedContent.length).toBe(totalSize);

    // 驗證內容正確性
    const expectedContent = Buffer.concat([chunk1, chunk2, chunk3]);
    expect(mergedContent.equals(expectedContent)).toBe(true);
  });

  test("亂序上傳 chunks 也應正確合併", async () => {
    const uploadId = "test-chunked-upload-2";
    const fileName = "out-of-order.bin";
    const userId = "test-user";
    const jobId = "test-job";

    const chunkSize = 1024;
    const chunk0 = Buffer.alloc(chunkSize, "0");
    const chunk1 = Buffer.alloc(chunkSize, "1");
    const chunk2 = Buffer.alloc(chunkSize, "2");
    const chunk3 = Buffer.alloc(chunkSize, "3");
    const totalSize = chunkSize * 4;
    const totalChunks = 4;

    const baseTempDir = join(testDir, "temp2");
    const targetDir = join(testDir, "uploads2");
    mkdirSync(baseTempDir, { recursive: true });
    mkdirSync(targetDir, { recursive: true });

    // 亂序上傳：3, 1, 0, 2
    await handleChunkUpload(
      uploadId,
      3,
      totalChunks,
      chunk3,
      fileName,
      totalSize,
      userId,
      jobId,
      baseTempDir,
      targetDir,
    );
    await handleChunkUpload(
      uploadId,
      1,
      totalChunks,
      chunk1,
      fileName,
      totalSize,
      userId,
      jobId,
      baseTempDir,
      targetDir,
    );
    await handleChunkUpload(
      uploadId,
      0,
      totalChunks,
      chunk0,
      fileName,
      totalSize,
      userId,
      jobId,
      baseTempDir,
      targetDir,
    );
    const finalResult = await handleChunkUpload(
      uploadId,
      2,
      totalChunks,
      chunk2,
      fileName,
      totalSize,
      userId,
      jobId,
      baseTempDir,
      targetDir,
    );

    expect(finalResult.success).toBe(true);
    expect(finalResult.completed).toBe(true);

    // 驗證檔案順序正確
    const mergedFile = join(targetDir, fileName);
    const mergedContent = readFileSync(mergedFile);

    // 即使亂序上傳，合併後應該按正確順序
    const expectedContent = Buffer.concat([chunk0, chunk1, chunk2, chunk3]);
    expect(mergedContent.equals(expectedContent)).toBe(true);
  });

  test("重複上傳相同 chunk 應被處理", async () => {
    const uploadId = "test-chunked-upload-3";
    const fileName = "duplicate-chunk.bin";
    const userId = "test-user";
    const jobId = "test-job";

    const chunkSize = 512;
    const chunk0 = Buffer.alloc(chunkSize, "X");
    const chunk1 = Buffer.alloc(chunkSize, "Y");
    const totalSize = chunkSize * 2;
    const totalChunks = 2;

    const baseTempDir = join(testDir, "temp3");
    const targetDir = join(testDir, "uploads3");
    mkdirSync(baseTempDir, { recursive: true });
    mkdirSync(targetDir, { recursive: true });

    // 上傳 chunk 0
    await handleChunkUpload(
      uploadId,
      0,
      totalChunks,
      chunk0,
      fileName,
      totalSize,
      userId,
      jobId,
      baseTempDir,
      targetDir,
    );

    // 重複上傳 chunk 0
    await handleChunkUpload(
      uploadId,
      0,
      totalChunks,
      chunk0,
      fileName,
      totalSize,
      userId,
      jobId,
      baseTempDir,
      targetDir,
    );

    // 上傳 chunk 1
    const result = await handleChunkUpload(
      uploadId,
      1,
      totalChunks,
      chunk1,
      fileName,
      totalSize,
      userId,
      jobId,
      baseTempDir,
      targetDir,
    );

    expect(result.success).toBe(true);
    expect(result.completed).toBe(true);

    // 驗證檔案大小正確（不應該因為重複上傳而變大）
    const mergedFile = join(targetDir, fileName);
    const stats = statSync(mergedFile);
    expect(stats.size).toBe(totalSize);
  });
});

describe("Chunk 數量計算測試", () => {
  test("應正確計算不同大小檔案的 chunk 數量", () => {
    const chunkSize = CHUNK_SIZE_BYTES;

    // 剛好 1 個 chunk
    expect(calculateChunkCount(chunkSize)).toBe(1);

    // 多 1 byte 需要 2 個 chunks
    expect(calculateChunkCount(chunkSize + 1)).toBe(2);

    // 50MB 需要 10 個 chunks
    expect(calculateChunkCount(50 * 1024 * 1024)).toBe(10);

    // 1 byte 需要 1 個 chunk
    expect(calculateChunkCount(1)).toBe(1);
  });
});
