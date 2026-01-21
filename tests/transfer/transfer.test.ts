/**
 * Contents.CN 全域檔案傳輸機制測試
 *
 * 測試項目：
 * 1. 小檔直傳測試（≤10MB）
 * 2. 大檔 chunk 上傳測試（>10MB）
 * 3. chunk 合併正確性測試
 * 4. .tar 封裝測試
 * 5. End-to-End 測試
 */

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { mkdirSync, existsSync, writeFileSync, rmSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  shouldUseChunkedUpload,
  calculateChunkCount,
  handleDirectUpload,
  uploadSessionManager,
} from "../../src/transfer/uploadManager";
import {
  shouldUseChunkedDownload,
  getChunkDownloadInfo,
  getChunk,
} from "../../src/transfer/downloadManager";
import {
  validateArchiveFormat,
  getArchiveFileName,
  createTarArchive,
} from "../../src/transfer/archiveManager";
import {
  CHUNK_THRESHOLD_BYTES,
  CHUNK_SIZE_BYTES,
  ALLOWED_ARCHIVE_FORMAT,
  FORBIDDEN_ARCHIVE_FORMATS,
} from "../../src/transfer/constants";
import { getTransferMode } from "../../src/transfer/types";

const testDir = "./test-output-transfer";

describe("傳輸常數測試", () => {
  test("CHUNK_THRESHOLD_BYTES 應為 10MB", () => {
    expect(CHUNK_THRESHOLD_BYTES).toBe(10 * 1024 * 1024);
  });

  test("CHUNK_SIZE_BYTES 應為 5MB", () => {
    expect(CHUNK_SIZE_BYTES).toBe(5 * 1024 * 1024);
  });

  test("唯一允許的封裝格式應為 .tar", () => {
    expect(ALLOWED_ARCHIVE_FORMAT).toBe(".tar");
  });

  test("禁止的封裝格式應包含 .tar.gz, .tgz, .zip, .gz", () => {
    expect(FORBIDDEN_ARCHIVE_FORMATS).toContain(".tar.gz");
    expect(FORBIDDEN_ARCHIVE_FORMATS).toContain(".tgz");
    expect(FORBIDDEN_ARCHIVE_FORMATS).toContain(".zip");
    expect(FORBIDDEN_ARCHIVE_FORMATS).toContain(".gz");
  });
});

describe("傳輸模式判斷測試", () => {
  test("≤10MB 應使用直傳模式", () => {
    expect(getTransferMode(10 * 1024 * 1024, CHUNK_THRESHOLD_BYTES)).toBe("direct");
    expect(getTransferMode(5 * 1024 * 1024, CHUNK_THRESHOLD_BYTES)).toBe("direct");
    expect(getTransferMode(1024, CHUNK_THRESHOLD_BYTES)).toBe("direct");
    expect(getTransferMode(0, CHUNK_THRESHOLD_BYTES)).toBe("direct");
  });

  test(">10MB 應使用 chunk 模式", () => {
    expect(getTransferMode(10 * 1024 * 1024 + 1, CHUNK_THRESHOLD_BYTES)).toBe("chunked");
    expect(getTransferMode(50 * 1024 * 1024, CHUNK_THRESHOLD_BYTES)).toBe("chunked");
    expect(getTransferMode(100 * 1024 * 1024, CHUNK_THRESHOLD_BYTES)).toBe("chunked");
  });

  test("shouldUseChunkedUpload 函數應正確判斷", () => {
    expect(shouldUseChunkedUpload(10 * 1024 * 1024)).toBe(false);
    expect(shouldUseChunkedUpload(10 * 1024 * 1024 + 1)).toBe(true);
  });
});

describe("Chunk 數量計算測試", () => {
  test("計算 chunk 數量應正確", () => {
    // 10MB / 5MB = 2 chunks
    expect(calculateChunkCount(10 * 1024 * 1024)).toBe(2);

    // 15MB / 5MB = 3 chunks
    expect(calculateChunkCount(15 * 1024 * 1024)).toBe(3);

    // 1 byte 也需要 1 chunk
    expect(calculateChunkCount(1)).toBe(1);

    // 5MB + 1 byte = 2 chunks
    expect(calculateChunkCount(5 * 1024 * 1024 + 1)).toBe(2);
  });
});

describe("封裝格式驗證測試", () => {
  test("validateArchiveFormat 應正確驗證格式", () => {
    // 允許的格式
    expect(validateArchiveFormat("output.tar")).toBe(true);
    expect(validateArchiveFormat("my_archive.tar")).toBe(true);

    // 禁止的格式
    expect(validateArchiveFormat("output.tar.gz")).toBe(false);
    expect(validateArchiveFormat("output.tgz")).toBe(false);
    expect(validateArchiveFormat("output.zip")).toBe(false);
    expect(validateArchiveFormat("output.gz")).toBe(false);
  });

  test("getArchiveFileName 應強制轉換為 .tar", () => {
    // 已經是 .tar
    expect(getArchiveFileName("output.tar")).toBe("output.tar");

    // 轉換 .tar.gz -> .tar
    expect(getArchiveFileName("output.tar.gz")).toBe("output.tar");

    // 轉換 .tgz -> .tar
    expect(getArchiveFileName("output.tgz")).toBe("output.tar");

    // 無副檔名 -> 加上 .tar
    expect(getArchiveFileName("output")).toBe("output.tar");

    // .zip 也是禁止的格式，會被移除並加上 .tar
    expect(getArchiveFileName("output.zip")).toBe("output.tar");

    // .gz 也是禁止的格式
    expect(getArchiveFileName("output.gz")).toBe("output.tar");
  });
});

describe("上傳管理測試", () => {
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

  test("小檔直傳應成功", async () => {
    const targetDir = join(testDir, "uploads");
    const testContent = "Hello, World!";
    const file = new File([testContent], "test.txt", { type: "text/plain" });

    const result = await handleDirectUpload(file, targetDir, "test.txt");

    expect(result.success).toBe(true);
    expect(existsSync(join(targetDir, "test.txt"))).toBe(true);
    expect(readFileSync(join(targetDir, "test.txt"), "utf-8")).toBe(testContent);
  });
});

describe("下載管理測試", () => {
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

  test("小檔不應使用 chunk 下載", () => {
    const smallFile = join(testDir, "small.txt");
    writeFileSync(smallFile, "Small content");

    expect(shouldUseChunkedDownload(smallFile)).toBe(false);
  });

  test("getChunkDownloadInfo 應返回正確資訊", () => {
    const testFile = join(testDir, "test.txt");
    const content = "Test content for download";
    writeFileSync(testFile, content);

    const info = getChunkDownloadInfo(testFile);

    expect(info).not.toBeNull();
    expect(info!.file_name).toBe("test.txt");
    expect(info!.total_size).toBe(content.length);
    expect(info!.chunk_size).toBe(CHUNK_SIZE_BYTES);
  });

  test("getChunk 應正確讀取 chunk 資料", async () => {
    const testFile = join(testDir, "test.txt");
    const content = "ABCDEFGHIJ"; // 10 bytes
    writeFileSync(testFile, content);

    // 讀取第一個 chunk（整個檔案，因為小於 chunk size）
    const chunk = await getChunk(testFile, 0, 5);

    expect(chunk).not.toBeNull();
    expect(chunk!.toString()).toBe("ABCDE");

    // 讀取第二個 chunk
    const chunk2 = await getChunk(testFile, 1, 5);
    expect(chunk2!.toString()).toBe("FGHIJ");
  });
});

describe(".tar 封裝測試", () => {
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

  test("createTarArchive 應建立 .tar 檔案", async () => {
    const sourceDir = join(testDir, "source");
    const outputTar = join(testDir, "output.tar");

    mkdirSync(sourceDir, { recursive: true });
    writeFileSync(join(sourceDir, "file1.txt"), "Content 1");
    writeFileSync(join(sourceDir, "file2.txt"), "Content 2");

    const result = await createTarArchive(sourceDir, outputTar);

    expect(existsSync(result)).toBe(true);
    expect(result.endsWith(".tar")).toBe(true);
    expect(result).not.toContain(".tar.gz");
  });

  test("createTarArchive 應強制使用 .tar 格式", async () => {
    const sourceDir = join(testDir, "source2");
    // 即使傳入 .tar.gz，也應該輸出 .tar
    const outputTar = join(testDir, "output.tar.gz");

    mkdirSync(sourceDir, { recursive: true });
    writeFileSync(join(sourceDir, "file.txt"), "Content");

    const result = await createTarArchive(sourceDir, outputTar);

    // 結果應該是 .tar 而非 .tar.gz
    expect(result.endsWith(".tar")).toBe(true);
    expect(result).not.toContain(".tar.gz");
  });
});

describe("End-to-End 測試", () => {
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

  test("完整流程：上傳 -> 封裝 -> 下載資訊", async () => {
    // 1. 模擬上傳
    const uploadsDir = join(testDir, "uploads");
    const outputDir = join(testDir, "output");
    mkdirSync(uploadsDir, { recursive: true });
    mkdirSync(outputDir, { recursive: true });

    const uploadedFile = join(uploadsDir, "document.pdf");
    writeFileSync(uploadedFile, "Fake PDF content");

    // 2. 模擬轉換輸出
    const conversionOutput = join(outputDir, "conversion_result");
    mkdirSync(conversionOutput, { recursive: true });
    writeFileSync(join(conversionOutput, "output.md"), "# Converted Document");
    mkdirSync(join(conversionOutput, "images"), { recursive: true });
    writeFileSync(join(conversionOutput, "images", "fig1.png"), "Fake image");

    // 3. 建立 .tar 封裝
    const tarPath = join(outputDir, "result.tar");
    const archivePath = await createTarArchive(conversionOutput, tarPath);

    expect(existsSync(archivePath)).toBe(true);
    expect(archivePath.endsWith(".tar")).toBe(true);

    // 4. 取得下載資訊
    const downloadInfo = getChunkDownloadInfo(archivePath);
    expect(downloadInfo).not.toBeNull();
    expect(downloadInfo!.file_name).toBe("result.tar");

    // 5. 驗證傳輸模式判斷
    const fileStats = statSync(archivePath);
    const shouldChunk = fileStats.size > CHUNK_THRESHOLD_BYTES;
    expect(shouldUseChunkedDownload(archivePath)).toBe(shouldChunk);
  });
});

describe("上傳會話管理測試", () => {
  test("應正確建立和管理上傳會話", () => {
    const uploadId = "test-upload-123";
    const session = uploadSessionManager.createSession(
      uploadId,
      "user-1",
      "job-1",
      "large-file.pdf",
      50 * 1024 * 1024, // 50MB
      10, // 10 chunks
      testDir,
    );

    expect(session.upload_id).toBe(uploadId);
    expect(session.total_chunks).toBe(10);
    expect(session.received_chunks.size).toBe(0);

    // 標記已接收 chunks
    uploadSessionManager.markChunkReceived(uploadId, 0);
    uploadSessionManager.markChunkReceived(uploadId, 1);

    const updatedSession = uploadSessionManager.getSession(uploadId);
    expect(updatedSession!.received_chunks.size).toBe(2);
    expect(uploadSessionManager.isComplete(uploadId)).toBe(false);

    // 清理
    uploadSessionManager.removeSession(uploadId);
    expect(uploadSessionManager.getSession(uploadId)).toBeUndefined();
  });
});
