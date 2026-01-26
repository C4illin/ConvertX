/**
 * 自動格式推斷服務
 *
 * 整合所有推斷模組，提供統一的推斷 API
 */

import {
  extractFeatures,
  extractFeaturesFromExtension,
  type FileFeatures,
} from "./featureExtraction";
import {
  FormatPredictionModel,
  formatPredictionModel,
  type FormatPrediction,
} from "./formatPredictionModel";
import {
  EnginePredictionModel,
  enginePredictionModel,
  type EnginePrediction,
} from "./enginePredictionModel";
import {
  initBehaviorTables,
  getUserProfile,
  logConversionEvent,
  logDismissEvent,
  calculateGlobalStats,
  cleanupOldEvents,
  type UserProfile,
  type FormatConversionStats,
} from "./behaviorStore";
import { engineWarmupManager, type WarmupStatus } from "./engineWarmup";

/**
 * 完整推斷結果
 */
export interface InferenceResult {
  /** 格式推斷結果 */
  format: FormatPrediction | null;
  /** 引擎推斷結果 */
  engine: EnginePrediction | null;
  /** 檔案特徵 */
  features: FileFeatures;
  /** 是否應自動填入 */
  should_auto_fill: boolean;
  /** 預調用狀態 */
  warmup_status?: WarmupStatus | null;
}

/**
 * 推斷服務配置
 */
export interface InferenceServiceConfig {
  /** 格式推斷最低信心度閾值 */
  formatConfidenceThreshold: number;
  /** 引擎推斷最低信心度閾值 */
  engineConfidenceThreshold: number;
  /** 是否啟用預調用 */
  enableWarmup: boolean;
  /** 預調用最低信心度閾值 */
  warmupConfidenceThreshold: number;
}

/**
 * 預設配置
 */
const DEFAULT_CONFIG: InferenceServiceConfig = {
  formatConfidenceThreshold: 0.4,
  engineConfidenceThreshold: 0.5,
  enableWarmup: true,
  warmupConfidenceThreshold: 0.7,
};

/**
 * 自動格式推斷服務類
 */
export class InferenceService {
  private config: InferenceServiceConfig;
  private formatModel: FormatPredictionModel;
  private engineModel: EnginePredictionModel;
  private globalStats: FormatConversionStats | null = null;
  private initialized = false;

  constructor(config: Partial<InferenceServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.formatModel = formatPredictionModel;
    this.engineModel = enginePredictionModel;

    // 設定模型閾值
    this.formatModel.setMinConfidenceThreshold(this.config.formatConfidenceThreshold);
  }

  /**
   * 初始化服務
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // 初始化行為資料表
      initBehaviorTables();

      // 載入全域統計
      this.globalStats = calculateGlobalStats();

      // 更新格式模型的流行度
      if (this.globalStats?.format_popularity) {
        this.formatModel.updateGlobalPopularity(this.globalStats.format_popularity);
      }

      this.initialized = true;
      console.log("✅ Inference service initialized");
    } catch (error) {
      console.error("Failed to initialize inference service:", error);
      throw error;
    }
  }

  /**
   * 根據檔案路徑進行推斷
   */
  async inferFromFile(
    filePath: string,
    userId: number,
    availableEngines?: string[],
  ): Promise<InferenceResult> {
    // 確保已初始化
    if (!this.initialized) {
      await this.initialize();
    }

    // 提取檔案特徵
    const features = await extractFeatures(filePath);

    return this.inferFromFeatures(features, userId, availableEngines);
  }

  /**
   * 根據副檔名快速推斷 (用於前端即時推斷)
   */
  async inferFromExtension(
    ext: string,
    userId: number,
    fileSizeKb?: number,
    availableEngines?: string[],
  ): Promise<InferenceResult> {
    // 確保已初始化
    if (!this.initialized) {
      await this.initialize();
    }

    // 從副檔名提取基礎特徵
    const baseFeatures = extractFeaturesFromExtension(ext);
    const features: FileFeatures = {
      ...baseFeatures,
      file_size_kb: fileSizeKb ?? 0,
    };

    return this.inferFromFeatures(features, userId, availableEngines);
  }

  /**
   * 根據特徵進行推斷
   */
  private async inferFromFeatures(
    features: FileFeatures,
    userId: number,
    availableEngines?: string[],
  ): Promise<InferenceResult> {
    // 取得使用者 Profile
    const userProfile = getUserProfile(userId);

    // 格式推斷
    const formatPrediction = this.formatModel.predict(
      features,
      userProfile,
      this.globalStats ?? undefined,
    );

    // 引擎推斷 (如果有格式預測)
    let enginePrediction: EnginePrediction | null = null;
    if (formatPrediction) {
      enginePrediction = this.engineModel.predict(
        formatPrediction.search_token,
        features,
        userProfile,
        availableEngines,
      );
    }

    // 決定是否自動填入
    const shouldAutoFill =
      formatPrediction !== null &&
      formatPrediction.confidence >= this.config.formatConfidenceThreshold;

    // 預調用處理
    let warmupStatus: WarmupStatus | null = null;
    if (
      this.config.enableWarmup &&
      enginePrediction?.should_warmup &&
      enginePrediction.confidence >= this.config.warmupConfidenceThreshold
    ) {
      // 啟動預調用 (非阻塞)
      engineWarmupManager.warmup(enginePrediction.engine).catch(console.error);
      warmupStatus = engineWarmupManager.getStatus();
    }

    return {
      format: formatPrediction,
      engine: enginePrediction,
      features,
      should_auto_fill: shouldAutoFill,
      warmup_status: warmupStatus,
    };
  }

  /**
   * 取消預調用 (當使用者行為與預測不一致時呼叫)
   */
  cancelWarmup(): void {
    engineWarmupManager.cancel();
  }

  /**
   * 記錄轉檔完成
   */
  logConversion(params: {
    userId: number;
    inputExt: string;
    searchedFormat: string;
    selectedEngine: string;
    success: boolean;
    durationMs: number;
    fileSizeKb?: number;
    megapixels?: number;
  }): void {
    const eventData: Parameters<typeof logConversionEvent>[0] = {
      user_id: params.userId,
      input_ext: params.inputExt,
      searched_format: params.searchedFormat,
      selected_engine: params.selectedEngine,
      success: params.success,
      duration_ms: params.durationMs,
    };

    if (params.fileSizeKb !== undefined) {
      eventData.file_size_kb = params.fileSizeKb;
    }
    if (params.megapixels !== undefined) {
      eventData.megapixels = params.megapixels;
    }

    logConversionEvent(eventData);

    // 定期更新全域統計 (每 100 次轉檔)
    this.maybeRefreshGlobalStats();
  }

  /**
   * 記錄推薦被拒絕
   */
  logDismiss(params: {
    userId: number;
    inputExt: string;
    dismissedFormat: string;
    dismissedEngine?: string;
  }): void {
    const eventData: Parameters<typeof logDismissEvent>[0] = {
      user_id: params.userId,
      input_ext: params.inputExt,
      dismissed_format: params.dismissedFormat,
    };

    if (params.dismissedEngine !== undefined) {
      eventData.dismissed_engine = params.dismissedEngine;
    }

    logDismissEvent(eventData);

    // 取消預調用
    this.cancelWarmup();
  }

  /**
   * 取得使用者 Profile
   */
  getUserProfile(userId: number): UserProfile | null {
    return getUserProfile(userId);
  }

  /**
   * 定期刷新全域統計
   */
  private refreshCounter = 0;
  private maybeRefreshGlobalStats(): void {
    this.refreshCounter++;
    if (this.refreshCounter >= 100) {
      this.refreshCounter = 0;
      setTimeout(() => {
        try {
          this.globalStats = calculateGlobalStats();
          if (this.globalStats?.format_popularity) {
            this.formatModel.updateGlobalPopularity(this.globalStats.format_popularity);
          }
        } catch (error) {
          console.error("Failed to refresh global stats:", error);
        }
      }, 100);
    }
  }

  /**
   * 清理過期資料
   */
  cleanup(daysToKeep = 90): number {
    return cleanupOldEvents(daysToKeep);
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<InferenceServiceConfig>): void {
    this.config = { ...this.config, ...config };
    this.formatModel.setMinConfidenceThreshold(this.config.formatConfidenceThreshold);
  }

  /**
   * 檢查引擎是否已預調用完成
   */
  isEngineReady(engine: string): boolean {
    return engineWarmupManager.isReady(engine);
  }

  /**
   * 取得預調用狀態
   */
  getWarmupStatus(): WarmupStatus | null {
    return engineWarmupManager.getStatus();
  }
}

// 導出單例
export const inferenceService = new InferenceService();
