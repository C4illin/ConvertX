/**
 * Contents.CN Chunk 上傳 API
 * 
 * 處理大檔的分段上傳
 */

import { Elysia, t } from "elysia";
import { WEBROOT } from "../helpers/env";
import { uploadsDir } from "../index";
import { userService } from "./user";
import sanitize from "sanitize-filename";
import {
  handleChunkUpload,
  shouldUseChunkedUpload,
  CHUNK_SIZE_BYTES,
  calculateChunkCount,
} from "../transfer";

export const uploadChunk = new Elysia().use(userService).post(
  "/upload-chunk",
  async ({ body, user, cookie: { jobId } }) => {
    if (!jobId?.value) {
      return {
        success: false,
        message: "No active job session",
      };
    }

    const { upload_id, chunk_index, total_chunks, file_name, total_size, chunk } = body;

    const sanitizedFileName = sanitize(file_name);
    const userUploadsDir = `${uploadsDir}${user.id}/${jobId.value}/`;

    // 取得 chunk 資料
    const chunkData = chunk instanceof Blob ? await chunk.arrayBuffer() : chunk;

    const result = await handleChunkUpload(
      upload_id,
      parseInt(chunk_index, 10),
      parseInt(total_chunks, 10),
      chunkData,
      sanitizedFileName,
      parseInt(total_size, 10),
      user.id,
      jobId.value,
      `${uploadsDir}${user.id}/`,
      userUploadsDir
    );

    return result;
  },
  {
    body: t.Object({
      upload_id: t.String(),
      chunk_index: t.String(),
      total_chunks: t.String(),
      file_name: t.String(),
      total_size: t.String(),
      chunk: t.File(),
    }),
    auth: true,
  }
);

/**
 * 取得上傳資訊（用於前端判斷是否需要 chunk 上傳）
 */
export const uploadInfo = new Elysia().use(userService).post(
  "/upload-info",
  async ({ body }) => {
    const { file_size } = body;
    const size = parseInt(file_size, 10);

    const useChunked = shouldUseChunkedUpload(size);
    
    return {
      use_chunked: useChunked,
      chunk_size: CHUNK_SIZE_BYTES,
      total_chunks: useChunked ? calculateChunkCount(size) : 1,
    };
  },
  {
    body: t.Object({
      file_size: t.String(),
    }),
    auth: true,
  }
);
