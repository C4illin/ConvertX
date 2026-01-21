/**
 * Contents.CN 後端上傳管理器
 * 
 * 統一處理所有檔案上傳，包含：
 * - 小檔（≤10MB）：直接接收
 * - 大檔（>10MB）：chunk 接收與合併
 */

import { existsSync, mkdirSync, rmSync, readdirSync, createWriteStream, statSync } from "node:fs";
import { join } from "node:path";
import { CHUNK_THRESHOLD_BYTES, CHUNK_SIZE_BYTES, UPLOAD_SESSION_TIMEOUT_MS, CHUNK_TEMP_DIR } from "./constants";
import type { UploadSession, ChunkUploadResponse, DirectUploadResponse } from "./types";
import { getTransferMode } from "./types";

/**
 * 上傳會話管理器
 * 用於追蹤進行中的 chunk 上傳
 */
class UploadSessionManager {
  private sessions: Map<string, UploadSession> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // 定期清理過期的 sessions
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000); // 每 5 分鐘清理一次
  }

  /**
   * 建立新的上傳會話
   */
  createSession(
    uploadId: string,
    userId: string,
    jobId: string,
    fileName: string,
    totalSize: number,
    totalChunks: number,
    baseTempDir: string
  ): UploadSession {
    const tempDir = join(baseTempDir, CHUNK_TEMP_DIR, uploadId);
    
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }

    const session: UploadSession = {
      upload_id: uploadId,
      user_id: userId,
      job_id: jobId,
      file_name: fileName,
      total_size: totalSize,
      total_chunks: totalChunks,
      received_chunks: new Set(),
      created_at: new Date(),
      temp_dir: tempDir,
    };

    this.sessions.set(uploadId, session);
    return session;
  }

  /**
   * 取得上傳會話
   */
  getSession(uploadId: string): UploadSession | undefined {
    return this.sessions.get(uploadId);
  }

  /**
   * 更新已接收的 chunk
   */
  markChunkReceived(uploadId: string, chunkIndex: number): boolean {
    const session = this.sessions.get(uploadId);
    if (!session) return false;
    
    session.received_chunks.add(chunkIndex);
    return true;
  }

  /**
   * 檢查是否所有 chunks 都已接收
   */
  isComplete(uploadId: string): boolean {
    const session = this.sessions.get(uploadId);
    if (!session) return false;
    
    return session.received_chunks.size === session.total_chunks;
  }

  /**
   * 移除會話並清理暫存檔案
   */
  removeSession(uploadId: string): void {
    const session = this.sessions.get(uploadId);
    if (session && existsSync(session.temp_dir)) {
      rmSync(session.temp_dir, { recursive: true, force: true });
    }
    this.sessions.delete(uploadId);
  }

  /**
   * 清理過期的會話
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [uploadId, session] of this.sessions) {
      if (now - session.created_at.getTime() > UPLOAD_SESSION_TIMEOUT_MS) {
        console.log(`Cleaning up expired upload session: ${uploadId}`);
        this.removeSession(uploadId);
      }
    }
  }

  /**
   * 停止清理計時器
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// 單例實例
export const uploadSessionManager = new UploadSessionManager();

/**
 * 判斷檔案是否需要使用 chunk 上傳
 */
export function shouldUseChunkedUpload(fileSize: number): boolean {
  return getTransferMode(fileSize, CHUNK_THRESHOLD_BYTES) === "chunked";
}

/**
 * 處理直接上傳（小檔）
 */
export async function handleDirectUpload(
  file: File,
  targetDir: string,
  fileName: string
): Promise<DirectUploadResponse> {
  try {
    const targetPath = join(targetDir, fileName);
    
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    await Bun.write(targetPath, file);

    return {
      success: true,
      message: "File uploaded successfully.",
      file_path: targetPath,
    };
  } catch (error) {
    console.error("Direct upload failed:", error);
    return {
      success: false,
      message: `Upload failed: ${error}`,
    };
  }
}

/**
 * 處理 chunk 上傳
 */
export async function handleChunkUpload(
  uploadId: string,
  chunkIndex: number,
  totalChunks: number,
  chunkData: ArrayBuffer | Blob | Buffer,
  fileName: string,
  totalSize: number,
  userId: string,
  jobId: string,
  baseTempDir: string,
  targetDir: string
): Promise<ChunkUploadResponse> {
  try {
    // 取得或建立會話
    let session = uploadSessionManager.getSession(uploadId);
    
    if (!session) {
      session = uploadSessionManager.createSession(
        uploadId,
        userId,
        jobId,
        fileName,
        totalSize,
        totalChunks,
        baseTempDir
      );
    }

    // 驗證會話資訊一致性
    if (session.total_chunks !== totalChunks || session.file_name !== fileName) {
      return {
        success: false,
        message: "Session mismatch: inconsistent upload parameters",
      };
    }

    // 儲存 chunk
    const chunkPath = join(session.temp_dir, `chunk_${chunkIndex.toString().padStart(6, "0")}`);
    // 處理不同類型的 chunk 資料
    let data: ArrayBuffer | Buffer;
    if (chunkData instanceof Blob) {
      data = await chunkData.arrayBuffer();
    } else if (Buffer.isBuffer(chunkData)) {
      data = chunkData;
    } else {
      data = chunkData;
    }
    await Bun.write(chunkPath, data);

    // 標記已接收
    uploadSessionManager.markChunkReceived(uploadId, chunkIndex);

    // 檢查是否完成
    if (uploadSessionManager.isComplete(uploadId)) {
      // 合併所有 chunks
      const finalPath = await mergeChunks(session, targetDir);
      
      // 清理會話
      uploadSessionManager.removeSession(uploadId);

      return {
        success: true,
        message: "Upload completed and merged successfully.",
        received_chunks: Array.from({ length: totalChunks }, (_, i) => i),
        completed: true,
        file_path: finalPath,
      };
    }

    return {
      success: true,
      message: `Chunk ${chunkIndex + 1}/${totalChunks} received.`,
      received_chunks: Array.from(session.received_chunks),
      completed: false,
    };
  } catch (error) {
    console.error("Chunk upload failed:", error);
    return {
      success: false,
      message: `Chunk upload failed: ${error}`,
    };
  }
}

/**
 * 合併所有 chunks 為完整檔案
 */
async function mergeChunks(session: UploadSession, targetDir: string): Promise<string> {
  const targetPath = join(targetDir, session.file_name);
  
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  // 讀取並排序所有 chunks
  const chunkFiles = readdirSync(session.temp_dir)
    .filter(f => f.startsWith("chunk_"))
    .sort();

  // 建立輸出串流
  const writeStream = createWriteStream(targetPath);

  // 依序寫入每個 chunk
  for (const chunkFile of chunkFiles) {
    const chunkPath = join(session.temp_dir, chunkFile);
    const chunkData = await Bun.file(chunkPath).arrayBuffer();
    writeStream.write(Buffer.from(chunkData));
  }

  // 結束寫入
  await new Promise<void>((resolve, reject) => {
    writeStream.end((err: Error | null) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // 驗證檔案大小
  const finalStats = statSync(targetPath);
  if (finalStats.size !== session.total_size) {
    console.warn(`File size mismatch: expected ${session.total_size}, got ${finalStats.size}`);
  }

  console.log(`Successfully merged ${chunkFiles.length} chunks into ${targetPath}`);
  return targetPath;
}

/**
 * 計算需要的 chunk 數量
 */
export function calculateChunkCount(fileSize: number, chunkSize: number = CHUNK_SIZE_BYTES): number {
  return Math.ceil(fileSize / chunkSize);
}
