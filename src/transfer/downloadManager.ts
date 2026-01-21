/**
 * Contents.CN 後端下載管理器
 * 
 * 統一處理所有檔案下載，包含：
 * - 小檔（≤10MB）：直接回傳
 * - 大檔（>10MB）：chunk 分段下載
 */

import { existsSync, statSync, createReadStream } from "node:fs";
import { CHUNK_THRESHOLD_BYTES, CHUNK_SIZE_BYTES } from "./constants";
import type { ChunkDownloadInfo } from "./types";
import { getTransferMode } from "./types";
import { basename } from "node:path";

/**
 * 判斷檔案是否需要使用 chunk 下載
 */
export function shouldUseChunkedDownload(filePath: string): boolean {
  if (!existsSync(filePath)) {
    return false;
  }
  const stats = statSync(filePath);
  return getTransferMode(stats.size, CHUNK_THRESHOLD_BYTES) === "chunked";
}

/**
 * 取得檔案的 chunk 下載資訊
 */
export function getChunkDownloadInfo(filePath: string): ChunkDownloadInfo | null {
  if (!existsSync(filePath)) {
    return null;
  }

  const stats = statSync(filePath);
  const fileName = basename(filePath);

  return {
    total_size: stats.size,
    total_chunks: Math.ceil(stats.size / CHUNK_SIZE_BYTES),
    chunk_size: CHUNK_SIZE_BYTES,
    file_name: fileName,
  };
}

/**
 * 取得特定 chunk 的資料
 */
export async function getChunk(
  filePath: string, 
  chunkIndex: number, 
  chunkSize: number = CHUNK_SIZE_BYTES
): Promise<Buffer | null> {
  if (!existsSync(filePath)) {
    return null;
  }

  const stats = statSync(filePath);
  const start = chunkIndex * chunkSize;
  const end = Math.min(start + chunkSize, stats.size);

  if (start >= stats.size) {
    return null;
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const stream = createReadStream(filePath, { start, end: end - 1 });

    stream.on("data", (chunk) => {
      chunks.push(chunk as Buffer);
    });

    stream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    stream.on("error", reject);
  });
}

/**
 * 直接取得完整檔案（小檔用）
 */
export function getFileForDirectDownload(filePath: string): ReturnType<typeof Bun.file> | null {
  if (!existsSync(filePath)) {
    return null;
  }
  return Bun.file(filePath);
}

/**
 * 建立 chunk 下載回應的 headers
 */
export function createChunkDownloadHeaders(
  info: ChunkDownloadInfo, 
  chunkIndex: number, 
  chunkData: Buffer
): Record<string, string> {
  const start = chunkIndex * info.chunk_size;
  const end = start + chunkData.length - 1;

  return {
    "Content-Type": "application/octet-stream",
    "Content-Length": chunkData.length.toString(),
    "Content-Range": `bytes ${start}-${end}/${info.total_size}`,
    "Accept-Ranges": "bytes",
    "X-Chunk-Index": chunkIndex.toString(),
    "X-Total-Chunks": info.total_chunks.toString(),
    "X-File-Name": encodeURIComponent(info.file_name),
    "X-Total-Size": info.total_size.toString(),
  };
}

/**
 * 建立直接下載回應的 headers
 */
export function createDirectDownloadHeaders(fileName: string, fileSize: number): Record<string, string> {
  return {
    "Content-Type": "application/octet-stream",
    "Content-Length": fileSize.toString(),
    "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
  };
}
