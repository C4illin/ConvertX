/**
 * Contents.CN 全域檔案傳輸常數
 *
 * 這些常數定義了整個系統的檔案傳輸規則
 */

/**
 * 檔案大小門檻（10MB）
 * - 小於等於此值：直接傳輸
 * - 大於此值：使用 chunk 分段傳輸
 */
export const CHUNK_THRESHOLD_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * 每個 chunk 的大小（5MB）
 */
export const CHUNK_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * 上傳 session 過期時間（毫秒）
 * 預設 1 小時
 */
export const UPLOAD_SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

/**
 * 暫存目錄名稱
 */
export const CHUNK_TEMP_DIR = "chunks_temp";

/**
 * 允許的封裝格式（僅 .tar）
 */
export const ALLOWED_ARCHIVE_FORMAT = ".tar";

/**
 * 禁止的封裝格式
 */
export const FORBIDDEN_ARCHIVE_FORMATS = [".tar.gz", ".tgz", ".zip", ".gz"];
