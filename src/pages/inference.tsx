/**
 * 推斷 API 端點
 *
 * 提供前端呼叫的推斷 API
 */

import { Elysia, t } from "elysia";
import { inferenceService } from "../inference";

export const inferenceApi = new Elysia({ prefix: "/inference" })
  /**
   * 根據副檔名推斷最可能的目標格式和引擎
   */
  .post(
    "/predict",
    async ({ body, cookie: { user_id } }) => {
      const userId = parseInt(String(user_id?.value ?? "0"), 10);

      try {
        const result = await inferenceService.inferFromExtension(
          body.ext,
          userId,
          body.file_size_kb,
          body.available_engines,
        );

        return {
          success: true,
          data: {
            format: result.format,
            engine: result.engine,
            should_auto_fill: result.should_auto_fill,
            warmup_status: result.warmup_status,
          },
        };
      } catch (error) {
        console.error("Inference prediction error:", error);
        return {
          success: false,
          error: "Failed to predict format",
        };
      }
    },
    {
      body: t.Object({
        ext: t.String({ description: "輸入檔案副檔名" }),
        file_size_kb: t.Optional(t.Number({ description: "檔案大小 (KB)" })),
        available_engines: t.Optional(t.Array(t.String(), { description: "可用引擎列表" })),
      }),
    },
  )

  /**
   * 記錄推薦被拒絕事件
   */
  .post(
    "/dismiss",
    async ({ body, cookie: { user_id } }) => {
      const userId = parseInt(String(user_id?.value ?? "0"), 10);

      try {
        const dismissParams: {
          userId: number;
          inputExt: string;
          dismissedFormat: string;
          dismissedEngine?: string;
        } = {
          userId,
          inputExt: body.input_ext,
          dismissedFormat: body.dismissed_format,
        };

        if (body.dismissed_engine !== undefined) {
          dismissParams.dismissedEngine = body.dismissed_engine;
        }

        inferenceService.logDismiss(dismissParams);

        return { success: true };
      } catch (error) {
        console.error("Failed to log dismiss event:", error);
        return { success: false };
      }
    },
    {
      body: t.Object({
        input_ext: t.String({ description: "輸入檔案副檔名" }),
        dismissed_format: t.String({ description: "被拒絕的推薦格式" }),
        dismissed_engine: t.Optional(t.String({ description: "被拒絕的推薦引擎" })),
      }),
    },
  )

  /**
   * 取消預調用
   */
  .post("/cancel-warmup", () => {
    try {
      inferenceService.cancelWarmup();
      return { success: true };
    } catch (error) {
      console.error("Failed to cancel warmup:", error);
      return { success: false };
    }
  })

  /**
   * 取得預調用狀態
   */
  .get("/warmup-status", () => {
    try {
      const status = inferenceService.getWarmupStatus();
      return {
        success: true,
        data: status,
      };
    } catch (error) {
      console.error("Failed to get warmup status:", error);
      return { success: false, data: null };
    }
  })

  /**
   * 取得使用者 Profile
   */
  .get("/profile", ({ cookie: { user_id } }) => {
    const userId = parseInt(String(user_id?.value ?? "0"), 10);

    try {
      const profile = inferenceService.getUserProfile(userId);
      return {
        success: true,
        data: profile,
      };
    } catch (error) {
      console.error("Failed to get user profile:", error);
      return { success: false, data: null };
    }
  });
