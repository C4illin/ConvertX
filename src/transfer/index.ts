/**
 * Contents.CN 全域檔案傳輸模組
 * 
 * 統一匯出所有傳輸相關功能
 */

// 常數
export {
  CHUNK_THRESHOLD_BYTES,
  CHUNK_SIZE_BYTES,
  UPLOAD_SESSION_TIMEOUT_MS,
  CHUNK_TEMP_DIR,
  ALLOWED_ARCHIVE_FORMAT,
  FORBIDDEN_ARCHIVE_FORMATS,
} from "./constants";

// 類型
export type {
  ChunkUploadRequest,
  ChunkUploadResponse,
  DirectUploadResponse,
  ChunkDownloadInfo,
  UploadSession,
  TransferMode,
} from "./types";

export { getTransferMode } from "./types";

// 上傳管理
export {
  uploadSessionManager,
  shouldUseChunkedUpload,
  handleDirectUpload,
  handleChunkUpload,
  calculateChunkCount,
} from "./uploadManager";

// 下載管理
export {
  shouldUseChunkedDownload,
  getChunkDownloadInfo,
  getChunk,
  getFileForDirectDownload,
  createChunkDownloadHeaders,
  createDirectDownloadHeaders,
} from "./downloadManager";

// 封裝管理
export {
  validateArchiveFormat,
  getArchiveFileName,
  createTarArchive,
  createJobArchive,
  createConverterArchive,
  getArchiveInfo,
} from "./archiveManager";
