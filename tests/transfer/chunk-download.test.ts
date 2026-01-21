/**
 * Contents.CN Chunk 下載整合測試
 * 
 * 測試大檔 chunk 下載的完整流程
 */

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { mkdirSync, existsSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
  shouldUseChunkedDownload,
  getChunkDownloadInfo,
  getChunk,
  createChunkDownloadHeaders,
} from "../../src/transfer/downloadManager";
import { CHUNK_SIZE_BYTES, CHUNK_THRESHOLD_BYTES } from "../../src/transfer/constants";

const testDir = "./test-output-chunk-download";

describe("Chunk 下載資訊測試", () => {
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

  test("getChunkDownloadInfo 應返回正確的下載資訊", () => {
    const testFile = join(testDir, "large-file.bin");
    const fileSize = 25 * 1024 * 1024; // 25MB
    
    // 建立一個假檔案（只寫入少量資料模擬）
    const content = Buffer.alloc(1024, "X"); // 1KB
    writeFileSync(testFile, content);

    const info = getChunkDownloadInfo(testFile);

    expect(info).not.toBeNull();
    expect(info!.file_name).toBe("large-file.bin");
    expect(info!.total_size).toBe(1024);
    expect(info!.chunk_size).toBe(CHUNK_SIZE_BYTES);
    expect(info!.total_chunks).toBe(1); // 1KB 只需要 1 chunk
  });

  test("不存在的檔案應返回 null", () => {
    const info = getChunkDownloadInfo(join(testDir, "non-existent.bin"));
    expect(info).toBeNull();
  });
});

describe("Chunk 讀取測試", () => {
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

  test("getChunk 應正確讀取指定的 chunk", async () => {
    const testFile = join(testDir, "chunked-file.bin");
    
    // 建立測試檔案：20 bytes，分成 4 個 5-byte chunks
    const content = "AAAAABBBBBCCCCCDDDD"; // 19 bytes
    writeFileSync(testFile, content);

    // 讀取第一個 chunk（5 bytes）
    const chunk0 = await getChunk(testFile, 0, 5);
    expect(chunk0!.toString()).toBe("AAAAA");

    // 讀取第二個 chunk
    const chunk1 = await getChunk(testFile, 1, 5);
    expect(chunk1!.toString()).toBe("BBBBB");

    // 讀取第三個 chunk
    const chunk2 = await getChunk(testFile, 2, 5);
    expect(chunk2!.toString()).toBe("CCCCC");

    // 讀取最後一個 chunk（只有 4 bytes）
    const chunk3 = await getChunk(testFile, 3, 5);
    expect(chunk3!.toString()).toBe("DDDD");
  });

  test("讀取超出範圍的 chunk 應返回 null", async () => {
    const testFile = join(testDir, "small-file.txt");
    writeFileSync(testFile, "Hello");

    const chunk = await getChunk(testFile, 10, 5); // 超出範圍
    expect(chunk).toBeNull();
  });

  test("不存在的檔案應返回 null", async () => {
    const chunk = await getChunk(join(testDir, "non-existent.bin"), 0, 5);
    expect(chunk).toBeNull();
  });
});

describe("Chunk 下載 Headers 測試", () => {
  test("createChunkDownloadHeaders 應生成正確的 headers", () => {
    const info = {
      total_size: 1000,
      total_chunks: 4,
      chunk_size: 256,
      file_name: "test-file.bin",
    };

    const chunkData = Buffer.alloc(256, "X");
    const headers = createChunkDownloadHeaders(info, 0, chunkData);

    expect(headers["Content-Type"]).toBe("application/octet-stream");
    expect(headers["Content-Length"]).toBe("256");
    expect(headers["Content-Range"]).toBe("bytes 0-255/1000");
    expect(headers["Accept-Ranges"]).toBe("bytes");
    expect(headers["X-Chunk-Index"]).toBe("0");
    expect(headers["X-Total-Chunks"]).toBe("4");
    expect(headers["X-Total-Size"]).toBe("1000");
  });

  test("最後一個 chunk 的 headers 應正確", () => {
    const info = {
      total_size: 1000,
      total_chunks: 4,
      chunk_size: 256,
      file_name: "test-file.bin",
    };

    // 最後一個 chunk 只有 232 bytes (1000 - 256*3)
    const chunkData = Buffer.alloc(232, "Z");
    const headers = createChunkDownloadHeaders(info, 3, chunkData);

    expect(headers["Content-Length"]).toBe("232");
    expect(headers["Content-Range"]).toBe("bytes 768-999/1000");
    expect(headers["X-Chunk-Index"]).toBe("3");
  });
});

describe("傳輸模式判斷測試", () => {
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

  test("小檔（≤10MB）不應使用 chunk 下載", () => {
    const smallFile = join(testDir, "small.txt");
    writeFileSync(smallFile, "Small file content");
    
    expect(shouldUseChunkedDownload(smallFile)).toBe(false);
  });

  test("不存在的檔案不應使用 chunk 下載", () => {
    expect(shouldUseChunkedDownload(join(testDir, "non-existent.bin"))).toBe(false);
  });
});

describe("完整 chunk 下載流程測試", () => {
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

  test("應能完整讀取並合併所有 chunks", async () => {
    const testFile = join(testDir, "complete-file.bin");
    const originalContent = "AAAAAABBBBBBCCCCCCDDDDDDEEEEEE"; // 30 bytes
    writeFileSync(testFile, originalContent);

    const info = getChunkDownloadInfo(testFile);
    expect(info).not.toBeNull();

    // 模擬分段讀取（每個 chunk 10 bytes）
    const chunkSize = 10;
    const totalChunks = Math.ceil(originalContent.length / chunkSize);
    const chunks: Buffer[] = [];

    for (let i = 0; i < totalChunks; i++) {
      const chunk = await getChunk(testFile, i, chunkSize);
      if (chunk) {
        chunks.push(chunk);
      }
    }

    // 合併所有 chunks
    const mergedContent = Buffer.concat(chunks).toString();
    expect(mergedContent).toBe(originalContent);
  });
});
