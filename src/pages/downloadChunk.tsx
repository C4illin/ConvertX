/**
 * Contents.CN Chunk 下載 API
 *
 * 處理大檔的分段下載
 */

import { Elysia } from "elysia";
import { outputDir } from "..";
import db from "../db/db";
import { userService } from "./user";
import sanitize from "sanitize-filename";
import {
  shouldUseChunkedDownload,
  getChunkDownloadInfo,
  getChunk,
  createChunkDownloadHeaders,
} from "../transfer";
import { existsSync } from "node:fs";

export const downloadChunk = new Elysia()
  .use(userService)
  /**
   * 取得檔案下載資訊
   */
  .get(
    "/download/:userId/:jobId/:fileName/info",
    async ({ params, user }) => {
      const userId = user.id;
      const job = await db
        .query("SELECT * FROM jobs WHERE user_id = ? AND id = ?")
        .get(user.id, params.jobId);

      if (!job) {
        return { error: "Job not found" };
      }

      const jobId = decodeURIComponent(params.jobId);
      const fileName = sanitize(decodeURIComponent(params.fileName));
      const filePath = `${outputDir}${userId}/${jobId}/${fileName}`;

      const info = getChunkDownloadInfo(filePath);

      if (!info) {
        return { error: "File not found" };
      }

      return {
        ...info,
        use_chunked: shouldUseChunkedDownload(filePath),
      };
    },
    { auth: true },
  )
  /**
   * 下載特定 chunk
   */
  .get(
    "/download/:userId/:jobId/:fileName/chunk/:chunkIndex",
    async ({ params, set, user }) => {
      const userId = user.id;
      const job = await db
        .query("SELECT * FROM jobs WHERE user_id = ? AND id = ?")
        .get(user.id, params.jobId);

      if (!job) {
        set.status = 404;
        return { error: "Job not found" };
      }

      const jobId = decodeURIComponent(params.jobId);
      const fileName = sanitize(decodeURIComponent(params.fileName));
      const chunkIndex = parseInt(params.chunkIndex, 10);
      const filePath = `${outputDir}${userId}/${jobId}/${fileName}`;

      const info = getChunkDownloadInfo(filePath);
      if (!info) {
        set.status = 404;
        return { error: "File not found" };
      }

      const chunkData = await getChunk(filePath, chunkIndex);
      if (!chunkData) {
        set.status = 404;
        return { error: "Chunk not found" };
      }

      const headers = createChunkDownloadHeaders(info, chunkIndex, chunkData);

      for (const [key, value] of Object.entries(headers)) {
        set.headers[key] = value;
      }

      return new Response(chunkData);
    },
    { auth: true },
  )
  /**
   * Archive chunk 下載資訊
   */
  .get(
    "/archive/:jobId/info",
    async ({ params, user }) => {
      const userId = user.id;
      const job = await db
        .query("SELECT * FROM jobs WHERE user_id = ? AND id = ?")
        .get(user.id, params.jobId);

      if (!job) {
        return { error: "Job not found" };
      }

      const jobId = decodeURIComponent(params.jobId);
      const archivePath = `${outputDir}${userId}/${jobId}/converted_files_${jobId}.tar`;

      if (!existsSync(archivePath)) {
        return { error: "Archive not found" };
      }

      const info = getChunkDownloadInfo(archivePath);

      if (!info) {
        return { error: "Archive not found" };
      }

      return {
        ...info,
        use_chunked: shouldUseChunkedDownload(archivePath),
      };
    },
    { auth: true },
  )
  /**
   * Archive chunk 下載
   */
  .get(
    "/archive/:jobId/chunk/:chunkIndex",
    async ({ params, set, user }) => {
      const userId = user.id;
      const job = await db
        .query("SELECT * FROM jobs WHERE user_id = ? AND id = ?")
        .get(user.id, params.jobId);

      if (!job) {
        set.status = 404;
        return { error: "Job not found" };
      }

      const jobId = decodeURIComponent(params.jobId);
      const chunkIndex = parseInt(params.chunkIndex, 10);
      const archivePath = `${outputDir}${userId}/${jobId}/converted_files_${jobId}.tar`;

      const info = getChunkDownloadInfo(archivePath);
      if (!info) {
        set.status = 404;
        return { error: "Archive not found" };
      }

      const chunkData = await getChunk(archivePath, chunkIndex);
      if (!chunkData) {
        set.status = 404;
        return { error: "Chunk not found" };
      }

      const headers = createChunkDownloadHeaders(info, chunkIndex, chunkData);

      for (const [key, value] of Object.entries(headers)) {
        set.headers[key] = value;
      }

      return new Response(chunkData);
    },
    { auth: true },
  );
