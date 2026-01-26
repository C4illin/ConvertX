/**
 * 格式預測模型
 *
 * 基於使用者行為歷史和檔案特徵預測最可能的目標格式
 * 輸出 search_token 用於 prefix matching 搜尋
 */

import { generateCandidates } from "./formatCandidateRules";
import { normalizeToken } from "./tokenLexicon";
import type { FileFeatures } from "./featureExtraction";
import type { UserProfile, FormatConversionStats } from "./behaviorStore";

/**
 * 格式預測結果
 */
export interface FormatPrediction {
  /** 預測的搜尋 token (用於 prefix matching) */
  search_token: string;
  /** 預測信心度 (0-1) */
  confidence: number;
  /** Top-K 候選 token */
  top_k: Array<{ token: string; score: number }>;
  /** 預測原因碼 */
  reason_codes: string[];
}

/**
 * 模型權重配置
 */
export interface ModelWeights {
  /** 使用者歷史權重 */
  user_history_weight: number;
  /** 規則先驗權重 */
  rule_prior_weight: number;
  /** 全域流行度權重 */
  global_popularity_weight: number;
  /** 最近使用權重 */
  recency_weight: number;
  /** 檔案特徵權重 */
  feature_weight: number;
}

/**
 * 預設模型權重
 */
const DEFAULT_WEIGHTS: ModelWeights = {
  user_history_weight: 0.45,
  rule_prior_weight: 0.25,
  global_popularity_weight: 0.15,
  recency_weight: 0.1,
  feature_weight: 0.05,
};

/**
 * 全域格式流行度 (預設值，會被實際統計覆蓋)
 */
const DEFAULT_GLOBAL_POPULARITY: Record<string, number> = {
  png: 0.85,
  jpeg: 0.8,
  pdf: 0.75,
  mp4: 0.7,
  webp: 0.65,
  mp3: 0.6,
  docx: 0.55,
  gif: 0.5,
  svg: 0.45,
  wav: 0.4,
  xlsx: 0.35,
  txt: 0.3,
  json: 0.25,
};

/**
 * 格式預測模型類
 */
export class FormatPredictionModel {
  private weights: ModelWeights;
  private globalPopularity: Record<string, number>;
  private minConfidenceThreshold: number;
  private coldStartThreshold: number;

  constructor(
    weights: Partial<ModelWeights> = {},
    globalPopularity: Record<string, number> = DEFAULT_GLOBAL_POPULARITY,
    minConfidenceThreshold = 0.35,
    coldStartThreshold = 0.15,
  ) {
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
    this.globalPopularity = globalPopularity;
    this.minConfidenceThreshold = minConfidenceThreshold;
    this.coldStartThreshold = coldStartThreshold;
  }

  /**
   * 預測最可能的目標格式
   */
  predict(
    features: FileFeatures,
    userProfile: UserProfile | null,
    globalStats?: FormatConversionStats,
  ): FormatPrediction | null {
    // 第一步：生成候選格式
    const candidateInput: {
      input_ext: string;
      magic_family: string;
      has_alpha?: boolean;
      is_animation?: boolean;
      megapixels?: number;
      color_mode?: string;
    } = {
      input_ext: features.input_ext,
      magic_family: features.magic_family,
    };

    if (features.image?.has_alpha !== undefined) {
      candidateInput.has_alpha = features.image.has_alpha;
    }
    if (features.image?.is_animation !== undefined) {
      candidateInput.is_animation = features.image.is_animation;
    }
    if (features.image?.megapixels !== undefined) {
      candidateInput.megapixels = features.image.megapixels;
    }
    if (features.image?.color_mode !== undefined) {
      candidateInput.color_mode = features.image.color_mode;
    }

    const { candidates, matched_rules } = generateCandidates(candidateInput);

    if (Object.keys(candidates).length === 0) {
      return null;
    }

    // 第二步：計算每個候選格式的得分
    const scoredFormats: Array<{
      format: string;
      score: number;
      components: Record<string, number>;
    }> = [];

    for (const [format, rulePrior] of Object.entries(candidates)) {
      const components: Record<string, number> = {};

      // 1. 規則先驗分數
      components.rule_prior = rulePrior * this.weights.rule_prior_weight;

      // 2. 使用者歷史偏好分數
      components.user_history =
        this.calculateUserHistoryScore(features.input_ext, format, userProfile) *
        this.weights.user_history_weight;

      // 3. 全域流行度分數
      const globalPop =
        globalStats?.format_popularity?.[format] ?? this.globalPopularity[format] ?? 0.1;
      components.global_popularity = globalPop * this.weights.global_popularity_weight;

      // 4. 最近使用分數
      components.recency =
        this.calculateRecencyScore(format, userProfile) * this.weights.recency_weight;

      // 5. 檔案特徵分數
      components.feature =
        this.calculateFeatureScore(features, format) * this.weights.feature_weight;

      // 總分
      const totalScore = Object.values(components).reduce((a, b) => a + b, 0);

      scoredFormats.push({
        format,
        score: totalScore,
        components,
      });
    }

    // 排序並取 Top-K
    scoredFormats.sort((a, b) => b.score - a.score);
    const topK = scoredFormats.slice(0, 5).map((s) => ({
      token: normalizeToken(s.format),
      score: Math.round(s.score * 100) / 100,
    }));

    // 最高分的格式
    const topFormat = scoredFormats[0];
    if (!topFormat) {
      return null;
    }

    // 計算信心度 (使用 softmax 正規化後的相對優勢)
    const confidence = this.calculateConfidence(scoredFormats);

    // 根據是否有使用者歷史選擇不同的閾值
    // 冷啟動時使用較低閾值，讓系統可以開始學習
    const hasUserHistory = userProfile && Object.keys(userProfile.format_preferences).length > 0;
    const effectiveThreshold = hasUserHistory
      ? this.minConfidenceThreshold
      : this.coldStartThreshold;

    // 如果信心度低於閾值，不推薦
    if (confidence < effectiveThreshold) {
      return null;
    }

    return {
      search_token: normalizeToken(topFormat.format),
      confidence: Math.round(confidence * 100) / 100,
      top_k: topK,
      reason_codes: matched_rules,
    };
  }

  /**
   * 計算使用者歷史偏好分數
   */
  private calculateUserHistoryScore(
    inputExt: string,
    targetFormat: string,
    userProfile: UserProfile | null,
  ): number {
    if (!userProfile) return 0;

    const conversionKey = `${inputExt}->${targetFormat}`;
    const preference = userProfile.format_preferences[conversionKey];

    if (preference !== undefined) {
      return preference;
    }

    // 檢查是否有任何以此格式為目標的記錄
    let totalToFormat = 0;
    let count = 0;
    const entries = Object.entries(userProfile.format_preferences) as [string, number][];
    for (const [key, value] of entries) {
      if (key.endsWith(`->${targetFormat}`)) {
        totalToFormat += value;
        count++;
      }
    }

    return count > 0 ? (totalToFormat / count) * 0.5 : 0;
  }

  /**
   * 計算最近使用分數
   */
  private calculateRecencyScore(format: string, userProfile: UserProfile | null): number {
    if (!userProfile?.recent_formats) return 0;

    const recentFormats = userProfile.recent_formats;
    const index = recentFormats.indexOf(format);

    if (index === -1) return 0;

    // 越近使用的分數越高
    const recencyScore = 1 - index / recentFormats.length;
    return recencyScore;
  }

  /**
   * 計算檔案特徵分數
   */
  private calculateFeatureScore(features: FileFeatures, format: string): number {
    let score = 0.5; // 基礎分

    if (features.image) {
      // 大圖優先考慮壓縮格式
      if (features.image.megapixels > 10) {
        if (["webp", "avif", "jxl", "heif"].includes(format)) {
          score += 0.2;
        }
      }

      // 有透明通道優先 PNG
      if (features.image.has_alpha) {
        if (format === "png" || format === "webp") {
          score += 0.3;
        }
      }

      // 動畫優先 GIF 或 WebP
      if (features.image.is_animation) {
        if (["gif", "webp", "apng"].includes(format)) {
          score += 0.3;
        }
      }
    }

    return Math.min(score, 1);
  }

  /**
   * 計算預測信心度
   */
  private calculateConfidence(scoredFormats: Array<{ format: string; score: number }>): number {
    if (scoredFormats.length === 0) return 0;

    const first = scoredFormats[0];
    if (!first) return 0;
    if (scoredFormats.length === 1) return first.score;

    const topScore = first.score;
    const secondScore = scoredFormats[1]?.score ?? 0;

    // 使用相對優勢計算信心度
    const gap = topScore - secondScore;
    const relativeGap = gap / (topScore + 0.001);

    // 結合絕對分數和相對優勢
    const confidence = topScore * 0.6 + relativeGap * 0.4;

    return Math.min(Math.max(confidence, 0), 1);
  }

  /**
   * 更新模型權重 (用於線上學習)
   */
  updateWeights(newWeights: Partial<ModelWeights>): void {
    this.weights = { ...this.weights, ...newWeights };
  }

  /**
   * 更新全域流行度統計
   */
  updateGlobalPopularity(popularity: Record<string, number>): void {
    this.globalPopularity = { ...this.globalPopularity, ...popularity };
  }

  /**
   * 設定最低信心度閾值
   */
  setMinConfidenceThreshold(threshold: number): void {
    this.minConfidenceThreshold = threshold;
  }
}

// 導出單例
export const formatPredictionModel = new FormatPredictionModel();
