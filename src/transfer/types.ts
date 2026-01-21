/**
 * Contents.CN 檔案傳輸類型定義
 */

/**
 * Chunk 上傳請求結構
 */
export interface ChunkUploadRequest {
  /** 上傳會話 ID（UUID） */
  upload_id: string;
  /** 當前 chunk 索引（從 0 開始） */
  chunk_index: number;
  /** 總 chunk 數量 */
  total_chunks: number;
  /** chunk 數據 */
  data: Blob | ArrayBuffer;
  /** 原始檔案名稱 */
  file_name: string;
  /** 檔案總大小 */
  total_size: number;
}

/**
 * Chunk 上傳回應結構
 */
export interface ChunkUploadResponse {
  success: boolean;
  message: string;
  /** 已接收的 chunks 索引列表 */
  received_chunks?: number[];
  /** 是否所有 chunks 都已接收完成 */
  completed?: boolean;
  /** 合併後的檔案路徑（僅完成時返回） */
  file_path?: string;
}

/**
 * 直接上傳回應結構
 */
export interface DirectUploadResponse {
  success: boolean;
  message: string;
  file_path?: string;
}

/**
 * Chunk 下載資訊
 */
export interface ChunkDownloadInfo {
  /** 檔案總大小 */
  total_size: number;
  /** chunk 數量 */
  total_chunks: number;
  /** 每個 chunk 大小 */
  chunk_size: number;
  /** 檔案名稱 */
  file_name: string;
}

/**
 * 上傳會話狀態
 */
export interface UploadSession {
  /** 上傳 ID */
  upload_id: string;
  /** 使用者 ID */
  user_id: string;
  /** Job ID */
  job_id: string;
  /** 檔案名稱 */
  file_name: string;
  /** 檔案總大小 */
  total_size: number;
  /** 總 chunk 數 */
  total_chunks: number;
  /** 已接收的 chunks */
  received_chunks: Set<number>;
  /** 建立時間 */
  created_at: Date;
  /** 暫存目錄路徑 */
  temp_dir: string;
}

/**
 * 傳輸模式
 */
export type TransferMode = "direct" | "chunked";

/**
 * 根據檔案大小決定傳輸模式
 */
export function getTransferMode(fileSize: number, thresholdBytes: number): TransferMode {
  return fileSize <= thresholdBytes ? "direct" : "chunked";
}
