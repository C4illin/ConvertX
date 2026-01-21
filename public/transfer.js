/**
 * Contents.CN 前端檔案傳輸管理器
 * 
 * 統一處理所有檔案的上傳與下載：
 * - 檔案 ≤ 10MB：直接傳輸
 * - 檔案 > 10MB：使用 chunk 分段傳輸
 * 
 * ⚠️ 重要：所有功能必須使用此模組，不得自行實作傳輸邏輯
 */

// ==================== 常數定義 ====================

/**
 * 檔案大小門檻（10MB）
 */
const CHUNK_THRESHOLD_BYTES = 10 * 1024 * 1024;

/**
 * 每個 chunk 的大小（5MB）
 */
const CHUNK_SIZE_BYTES = 5 * 1024 * 1024;

// ==================== 工具函數 ====================

/**
 * 生成 UUID（用於 upload_id）
 */
function generateUploadId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // 降級方案
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 判斷是否需要使用 chunk 傳輸
 */
function shouldUseChunkedTransfer(fileSize) {
  return fileSize > CHUNK_THRESHOLD_BYTES;
}

/**
 * 計算 chunk 數量
 */
function calculateChunkCount(fileSize) {
  return Math.ceil(fileSize / CHUNK_SIZE_BYTES);
}

// ==================== 上傳管理器 ====================

/**
 * 上傳管理器類別
 */
class UploadManager {
  /**
   * @param {string} webroot - 網站根路徑
   */
  constructor(webroot) {
    this.webroot = webroot;
    this.activeUploads = new Map();
  }

  /**
   * 上傳檔案（自動判斷使用直傳或 chunk）
   * 
   * @param {File} file - 要上傳的檔案
   * @param {object} options - 選項
   * @param {function} options.onProgress - 進度回調 (percent: number) => void
   * @param {function} options.onComplete - 完成回調 (response: object) => void
   * @param {function} options.onError - 錯誤回調 (error: Error) => void
   * @returns {Promise<object>} 上傳結果
   */
  async uploadFile(file, options = {}) {
    const { onProgress, onComplete, onError } = options;

    try {
      let result;
      
      if (shouldUseChunkedTransfer(file.size)) {
        // 大檔：使用 chunk 上傳
        result = await this.uploadChunked(file, onProgress);
      } else {
        // 小檔：直接上傳
        result = await this.uploadDirect(file, onProgress);
      }

      if (onComplete) onComplete(result);
      return result;
    } catch (error) {
      if (onError) onError(error);
      throw error;
    }
  }

  /**
   * 直接上傳（小檔）
   */
  async uploadDirect(file, onProgress) {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append("file", file, file.name);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${this.webroot}/upload`, true);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          const percent = (e.loaded / e.total) * 100;
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data);
          } catch {
            resolve({ success: true, message: "Upload completed" });
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error("Upload failed"));
      xhr.send(formData);
    });
  }

  /**
   * Chunk 上傳（大檔）
   */
  async uploadChunked(file, onProgress) {
    const uploadId = generateUploadId();
    const totalChunks = calculateChunkCount(file.size);
    
    this.activeUploads.set(uploadId, {
      file,
      totalChunks,
      uploadedChunks: 0,
      status: "uploading"
    });

    try {
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE_BYTES;
        const end = Math.min(start + CHUNK_SIZE_BYTES, file.size);
        const chunk = file.slice(start, end);

        await this.uploadChunk(uploadId, chunkIndex, totalChunks, chunk, file.name, file.size);

        // 更新進度
        const uploadInfo = this.activeUploads.get(uploadId);
        if (uploadInfo) {
          uploadInfo.uploadedChunks = chunkIndex + 1;
          const percent = ((chunkIndex + 1) / totalChunks) * 100;
          if (onProgress) onProgress(percent);
        }
      }

      this.activeUploads.delete(uploadId);
      return { success: true, message: "Chunked upload completed", upload_id: uploadId };
    } catch (error) {
      this.activeUploads.delete(uploadId);
      throw error;
    }
  }

  /**
   * 上傳單個 chunk
   */
  async uploadChunk(uploadId, chunkIndex, totalChunks, chunkData, fileName, totalSize) {
    const formData = new FormData();
    formData.append("upload_id", uploadId);
    formData.append("chunk_index", chunkIndex.toString());
    formData.append("total_chunks", totalChunks.toString());
    formData.append("file_name", fileName);
    formData.append("total_size", totalSize.toString());
    formData.append("chunk", chunkData);

    const response = await fetch(`${this.webroot}/upload-chunk`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Chunk ${chunkIndex} upload failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * 取消上傳
   */
  cancelUpload(uploadId) {
    const upload = this.activeUploads.get(uploadId);
    if (upload) {
      upload.status = "cancelled";
      this.activeUploads.delete(uploadId);
    }
  }
}

// ==================== 下載管理器 ====================

/**
 * 下載管理器類別
 */
class DownloadManager {
  /**
   * @param {string} webroot - 網站根路徑
   */
  constructor(webroot) {
    this.webroot = webroot;
  }

  /**
   * 下載檔案（自動判斷使用直傳或 chunk）
   * 
   * @param {string} url - 下載 URL
   * @param {string} fileName - 檔案名稱
   * @param {object} options - 選項
   * @param {function} options.onProgress - 進度回調
   * @returns {Promise<Blob>} 下載的檔案
   */
  async downloadFile(url, fileName, options = {}) {
    const { onProgress } = options;

    // 先取得檔案資訊
    const info = await this.getFileInfo(url);
    
    if (!info) {
      // 無法取得資訊，使用直接下載
      return this.downloadDirect(url, fileName);
    }

    if (shouldUseChunkedTransfer(info.total_size)) {
      // 大檔：使用 chunk 下載
      return this.downloadChunked(url, fileName, info, onProgress);
    } else {
      // 小檔：直接下載
      return this.downloadDirect(url, fileName, onProgress);
    }
  }

  /**
   * 取得檔案資訊
   */
  async getFileInfo(url) {
    try {
      const response = await fetch(`${url}/info`, { method: "GET" });
      if (response.ok) {
        return response.json();
      }
    } catch {
      // 忽略錯誤，降級為直接下載
    }
    return null;
  }

  /**
   * 直接下載（小檔）
   */
  async downloadDirect(url, fileName, onProgress) {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    const contentLength = response.headers.get("Content-Length");
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    
    const reader = response.body.getReader();
    const chunks = [];
    let loaded = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      chunks.push(value);
      loaded += value.length;

      if (onProgress && total > 0) {
        onProgress((loaded / total) * 100);
      }
    }

    const blob = new Blob(chunks);
    this.triggerDownload(blob, fileName);
    return blob;
  }

  /**
   * Chunk 下載（大檔）
   */
  async downloadChunked(url, fileName, info, onProgress) {
    const { total_chunks, chunk_size, total_size } = info;
    const chunks = [];
    
    for (let i = 0; i < total_chunks; i++) {
      const chunkData = await this.downloadChunk(url, i);
      chunks.push(chunkData);
      
      if (onProgress) {
        const loaded = Math.min((i + 1) * chunk_size, total_size);
        onProgress((loaded / total_size) * 100);
      }
    }

    const blob = new Blob(chunks);
    this.triggerDownload(blob, fileName);
    return blob;
  }

  /**
   * 下載單個 chunk
   */
  async downloadChunk(url, chunkIndex) {
    const response = await fetch(`${url}/chunk/${chunkIndex}`);
    
    if (!response.ok) {
      throw new Error(`Chunk ${chunkIndex} download failed: ${response.status}`);
    }

    return response.arrayBuffer();
  }

  /**
   * 觸發瀏覽器下載
   */
  triggerDownload(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * 簡單下載（不使用 chunk，用於向後相容）
   */
  async simpleDownload(url, fileName) {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

// ==================== 全域實例 ====================

// 從 meta 標籤取得 webroot
const webrootMeta = document.querySelector("meta[name='webroot']");
const webroot = webrootMeta ? webrootMeta.content : "";

// 建立全域實例
window.ContentsTransfer = {
  uploadManager: new UploadManager(webroot),
  downloadManager: new DownloadManager(webroot),
  
  // 工具函數
  shouldUseChunkedTransfer,
  calculateChunkCount,
  
  // 常數
  CHUNK_THRESHOLD_BYTES,
  CHUNK_SIZE_BYTES,
};

// 向後相容：提供簡化的 API
window.uploadFile = (file, options) => window.ContentsTransfer.uploadManager.uploadFile(file, options);
window.downloadFile = (url, fileName, options) => window.ContentsTransfer.downloadManager.downloadFile(url, fileName, options);

console.log("Contents.CN Transfer Module initialized");
