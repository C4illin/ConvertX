/**
 * 引擎預測模型
 *
 * 根據目標格式、檔案特徵和使用者偏好預測最適合的轉換引擎
 */

import type { FileFeatures } from "./featureExtraction";
import type { UserProfile } from "./behaviorStore";

/**
 * 引擎能力描述
 */
export interface EngineCapability {
  /** 引擎優勢描述 */
  strength: string;
  /** 冷啟動成本 (毫秒) */
  cold_start_cost: number;
  /** 是否禁止用於此格式 */
  disallowed?: boolean;
  /** 最佳適用場景 */
  best_for?: string[];
  /** 處理大檔案的能力 (0-1) */
  large_file_capability?: number;
  /** 品質優先程度 (0-1) */
  quality_priority?: number;
  /** 速度優先程度 (0-1) */
  speed_priority?: number;
}

/**
 * 引擎能力矩陣
 * 定義每種格式可用的引擎及其特性
 */
export const ENGINE_CAPABILITY_MATRIX: Record<string, Record<string, EngineCapability>> = {
  // ==================== 圖片格式 ====================
  png: {
    vips: {
      strength: "large_image_fast",
      cold_start_cost: 300,
      best_for: ["large_images", "batch_processing"],
      large_file_capability: 0.95,
      speed_priority: 0.9,
      quality_priority: 0.85,
    },
    imagemagick: {
      strength: "general_purpose",
      cold_start_cost: 500,
      best_for: ["general", "filters", "effects"],
      large_file_capability: 0.7,
      speed_priority: 0.7,
      quality_priority: 0.9,
    },
    graphicsmagick: {
      strength: "memory_efficient",
      cold_start_cost: 400,
      best_for: ["memory_constrained", "simple_conversions"],
      large_file_capability: 0.8,
      speed_priority: 0.75,
      quality_priority: 0.85,
    },
    ffmpeg: {
      strength: "video_only",
      cold_start_cost: 800,
      disallowed: true,
    },
  },
  jpeg: {
    vips: {
      strength: "large_image_fast",
      cold_start_cost: 300,
      best_for: ["large_images", "photos"],
      large_file_capability: 0.95,
      speed_priority: 0.9,
      quality_priority: 0.85,
    },
    imagemagick: {
      strength: "general_purpose",
      cold_start_cost: 500,
      best_for: ["general", "quality_control"],
      large_file_capability: 0.7,
      speed_priority: 0.7,
      quality_priority: 0.9,
    },
    graphicsmagick: {
      strength: "memory_efficient",
      cold_start_cost: 400,
      large_file_capability: 0.8,
      speed_priority: 0.75,
      quality_priority: 0.85,
    },
  },
  webp: {
    vips: {
      strength: "fast_modern_formats",
      cold_start_cost: 300,
      best_for: ["web_optimization", "large_images"],
      large_file_capability: 0.95,
      speed_priority: 0.9,
      quality_priority: 0.9,
    },
    imagemagick: {
      strength: "general_purpose",
      cold_start_cost: 500,
      best_for: ["general"],
      large_file_capability: 0.7,
      speed_priority: 0.7,
      quality_priority: 0.85,
    },
    libheif: {
      strength: "heif_webp_specialist",
      cold_start_cost: 400,
      best_for: ["modern_formats"],
      large_file_capability: 0.85,
      speed_priority: 0.8,
      quality_priority: 0.9,
    },
  },
  avif: {
    vips: {
      strength: "fast_avif",
      cold_start_cost: 300,
      best_for: ["modern_formats", "compression"],
      large_file_capability: 0.9,
      speed_priority: 0.85,
      quality_priority: 0.95,
    },
    libheif: {
      strength: "avif_specialist",
      cold_start_cost: 400,
      best_for: ["avif_native"],
      large_file_capability: 0.85,
      speed_priority: 0.8,
      quality_priority: 0.95,
    },
    imagemagick: {
      strength: "fallback",
      cold_start_cost: 500,
      large_file_capability: 0.6,
      speed_priority: 0.5,
      quality_priority: 0.8,
    },
  },
  gif: {
    imagemagick: {
      strength: "animation_expert",
      cold_start_cost: 500,
      best_for: ["animations", "optimization"],
      large_file_capability: 0.7,
      speed_priority: 0.7,
      quality_priority: 0.9,
    },
    vips: {
      strength: "fast_static",
      cold_start_cost: 300,
      best_for: ["static_gifs"],
      large_file_capability: 0.9,
      speed_priority: 0.9,
      quality_priority: 0.8,
    },
    ffmpeg: {
      strength: "video_to_gif",
      cold_start_cost: 800,
      best_for: ["video_source"],
      large_file_capability: 0.9,
      speed_priority: 0.7,
      quality_priority: 0.85,
    },
  },
  svg: {
    inkscape: {
      strength: "svg_expert",
      cold_start_cost: 1500,
      best_for: ["vector_editing", "complex_svg"],
      large_file_capability: 0.7,
      speed_priority: 0.5,
      quality_priority: 1.0,
    },
    resvg: {
      strength: "fast_svg_render",
      cold_start_cost: 200,
      best_for: ["svg_to_png", "simple_render"],
      large_file_capability: 0.85,
      speed_priority: 0.95,
      quality_priority: 0.9,
    },
    imagemagick: {
      strength: "fallback",
      cold_start_cost: 500,
      large_file_capability: 0.6,
      speed_priority: 0.6,
      quality_priority: 0.7,
    },
  },
  pdf: {
    libreoffice: {
      strength: "document_expert",
      cold_start_cost: 3000,
      best_for: ["office_to_pdf", "complex_documents"],
      large_file_capability: 0.8,
      speed_priority: 0.4,
      quality_priority: 0.95,
    },
    imagemagick: {
      strength: "image_to_pdf",
      cold_start_cost: 500,
      best_for: ["image_conversion"],
      large_file_capability: 0.7,
      speed_priority: 0.7,
      quality_priority: 0.85,
    },
    pandoc: {
      strength: "markdown_to_pdf",
      cold_start_cost: 1000,
      best_for: ["markdown", "text_documents"],
      large_file_capability: 0.8,
      speed_priority: 0.6,
      quality_priority: 0.9,
    },
  },

  // ==================== 影片格式 ====================
  mp4: {
    ffmpeg: {
      strength: "video_universal",
      cold_start_cost: 800,
      best_for: ["all_video"],
      large_file_capability: 0.95,
      speed_priority: 0.8,
      quality_priority: 0.9,
    },
  },
  webm: {
    ffmpeg: {
      strength: "video_universal",
      cold_start_cost: 800,
      best_for: ["web_video"],
      large_file_capability: 0.95,
      speed_priority: 0.75,
      quality_priority: 0.9,
    },
  },
  mkv: {
    ffmpeg: {
      strength: "video_universal",
      cold_start_cost: 800,
      best_for: ["container_conversion"],
      large_file_capability: 0.95,
      speed_priority: 0.85,
      quality_priority: 0.95,
    },
  },

  // ==================== 音訊格式 ====================
  mp3: {
    ffmpeg: {
      strength: "audio_universal",
      cold_start_cost: 800,
      best_for: ["all_audio"],
      large_file_capability: 0.95,
      speed_priority: 0.9,
      quality_priority: 0.85,
    },
  },
  wav: {
    ffmpeg: {
      strength: "audio_universal",
      cold_start_cost: 800,
      best_for: ["lossless_audio"],
      large_file_capability: 0.95,
      speed_priority: 0.9,
      quality_priority: 1.0,
    },
  },
  flac: {
    ffmpeg: {
      strength: "audio_universal",
      cold_start_cost: 800,
      best_for: ["lossless_compression"],
      large_file_capability: 0.95,
      speed_priority: 0.85,
      quality_priority: 1.0,
    },
  },

  // ==================== 文件格式 ====================
  docx: {
    libreoffice: {
      strength: "document_expert",
      cold_start_cost: 3000,
      best_for: ["office_documents"],
      large_file_capability: 0.8,
      speed_priority: 0.4,
      quality_priority: 0.95,
    },
    pandoc: {
      strength: "text_conversion",
      cold_start_cost: 1000,
      best_for: ["simple_documents", "markdown_source"],
      large_file_capability: 0.7,
      speed_priority: 0.7,
      quality_priority: 0.85,
    },
  },
  txt: {
    pandoc: {
      strength: "text_extraction",
      cold_start_cost: 500,
      best_for: ["text_extraction"],
      large_file_capability: 0.9,
      speed_priority: 0.9,
      quality_priority: 0.9,
    },
    markitDown: {
      strength: "ai_extraction",
      cold_start_cost: 800,
      best_for: ["complex_documents"],
      large_file_capability: 0.7,
      speed_priority: 0.6,
      quality_priority: 0.95,
    },
  },
  md: {
    pandoc: {
      strength: "markdown_expert",
      cold_start_cost: 500,
      best_for: ["markdown_conversion"],
      large_file_capability: 0.9,
      speed_priority: 0.9,
      quality_priority: 0.95,
    },
    markitDown: {
      strength: "ai_extraction",
      cold_start_cost: 800,
      best_for: ["pdf_to_md", "image_to_md"],
      large_file_capability: 0.7,
      speed_priority: 0.6,
      quality_priority: 0.9,
    },
  },
  epub: {
    calibre: {
      strength: "ebook_expert",
      cold_start_cost: 2000,
      best_for: ["ebook_conversion"],
      large_file_capability: 0.85,
      speed_priority: 0.5,
      quality_priority: 0.95,
    },
    pandoc: {
      strength: "simple_epub",
      cold_start_cost: 1000,
      best_for: ["simple_ebooks"],
      large_file_capability: 0.7,
      speed_priority: 0.7,
      quality_priority: 0.8,
    },
  },

  // ==================== 資料格式 ====================
  json: {
    dasel: {
      strength: "data_transform",
      cold_start_cost: 100,
      best_for: ["data_conversion"],
      large_file_capability: 0.9,
      speed_priority: 0.95,
      quality_priority: 0.95,
    },
  },
  yaml: {
    dasel: {
      strength: "data_transform",
      cold_start_cost: 100,
      best_for: ["data_conversion"],
      large_file_capability: 0.9,
      speed_priority: 0.95,
      quality_priority: 0.95,
    },
  },
  csv: {
    dasel: {
      strength: "data_transform",
      cold_start_cost: 100,
      best_for: ["structured_data"],
      large_file_capability: 0.9,
      speed_priority: 0.95,
      quality_priority: 0.9,
    },
  },

  // ==================== 3D 模型格式 ====================
  obj: {
    assimp: {
      strength: "3d_universal",
      cold_start_cost: 600,
      best_for: ["3d_conversion"],
      large_file_capability: 0.8,
      speed_priority: 0.7,
      quality_priority: 0.9,
    },
  },
  gltf: {
    assimp: {
      strength: "3d_universal",
      cold_start_cost: 600,
      best_for: ["web_3d"],
      large_file_capability: 0.8,
      speed_priority: 0.7,
      quality_priority: 0.9,
    },
  },
  stl: {
    assimp: {
      strength: "3d_universal",
      cold_start_cost: 600,
      best_for: ["3d_printing"],
      large_file_capability: 0.85,
      speed_priority: 0.75,
      quality_priority: 0.9,
    },
  },
};

/**
 * 引擎預測結果
 */
export interface EnginePrediction {
  /** 預測的引擎名稱 */
  engine: string;
  /** 預測信心度 (0-1) */
  confidence: number;
  /** 是否應該預調用 */
  should_warmup: boolean;
  /** 預估冷啟動成本 (毫秒) */
  cold_start_cost: number;
  /** 預測原因 */
  reason: string;
}

/**
 * 引擎預測模型類
 */
export class EnginePredictionModel {
  private warmupConfidenceThreshold: number;
  private warmupMinColdStartCost: number;

  constructor(warmupConfidenceThreshold = 0.7, warmupMinColdStartCost = 500) {
    this.warmupConfidenceThreshold = warmupConfidenceThreshold;
    this.warmupMinColdStartCost = warmupMinColdStartCost;
  }

  /**
   * 預測最適合的轉換引擎
   */
  predict(
    targetFormat: string,
    features: FileFeatures,
    userProfile: UserProfile | null,
    availableEngines?: string[],
  ): EnginePrediction | null {
    const formatEngines = ENGINE_CAPABILITY_MATRIX[targetFormat];
    if (!formatEngines) {
      return null;
    }

    // 過濾可用引擎
    let engines = Object.entries(formatEngines);

    if (availableEngines && availableEngines.length > 0) {
      engines = engines.filter(([name]) => availableEngines.includes(name));
    }

    // 過濾禁止的引擎
    engines = engines.filter(([, cap]) => !cap.disallowed);

    if (engines.length === 0) {
      return null;
    }

    // 計算每個引擎的得分
    const scoredEngines: Array<{
      engine: string;
      score: number;
      cap: EngineCapability;
      reason: string;
    }> = [];

    for (const [engineName, capability] of engines) {
      let score = 0;
      let reason = "";

      // 1. 使用者歷史偏好
      const userPref = this.getUserEnginePreference(targetFormat, engineName, userProfile);
      score += userPref * 0.4;
      if (userPref > 0.5) {
        reason = "user_preference";
      }

      // 2. 檔案特徵匹配
      const featureScore = this.calculateFeatureMatchScore(features, capability);
      score += featureScore * 0.35;
      if (featureScore > 0.7 && !reason) {
        reason = "feature_match";
      }

      // 3. 歷史成功率 (假設都有好的成功率，用能力值代替)
      const reliabilityScore = (capability.quality_priority ?? 0.8) * 0.15;
      score += reliabilityScore;

      // 4. 速度考量
      const speedScore = (capability.speed_priority ?? 0.7) * 0.1;
      score += speedScore;

      if (!reason) {
        reason = "balanced_choice";
      }

      scoredEngines.push({
        engine: engineName,
        score,
        cap: capability,
        reason,
      });
    }

    // 排序取最佳
    scoredEngines.sort((a, b) => b.score - a.score);
    const bestEngine = scoredEngines[0];

    if (!bestEngine) {
      return null;
    }

    // 計算信心度
    const confidence = this.calculateConfidence(scoredEngines);

    // 決定是否預調用
    const shouldWarmup =
      confidence >= this.warmupConfidenceThreshold &&
      bestEngine.cap.cold_start_cost >= this.warmupMinColdStartCost;

    return {
      engine: bestEngine.engine,
      confidence: Math.round(confidence * 100) / 100,
      should_warmup: shouldWarmup,
      cold_start_cost: bestEngine.cap.cold_start_cost,
      reason: bestEngine.reason,
    };
  }

  /**
   * 取得使用者對特定格式的引擎偏好
   */
  private getUserEnginePreference(
    format: string,
    engine: string,
    userProfile: UserProfile | null,
  ): number {
    if (!userProfile?.engine_preferences) return 0;

    const formatPrefs = userProfile.engine_preferences[format];
    if (!formatPrefs) return 0;

    return formatPrefs[engine] ?? 0;
  }

  /**
   * 計算檔案特徵與引擎能力的匹配分數
   */
  private calculateFeatureMatchScore(features: FileFeatures, capability: EngineCapability): number {
    let score = 0.5; // 基礎分

    // 大檔案處理能力
    if (features.file_size_kb > 5000) {
      // > 5MB
      score += (capability.large_file_capability ?? 0.5) * 0.3;
    }

    // 圖片特定評估
    if (features.image) {
      // 高解析度圖片
      if (features.image.megapixels > 10) {
        score += (capability.large_file_capability ?? 0.5) * 0.2;
        score += (capability.speed_priority ?? 0.5) * 0.1;
      }

      // 檢查 best_for 標籤
      if (capability.best_for) {
        if (features.image.megapixels > 10 && capability.best_for.includes("large_images")) {
          score += 0.2;
        }
        if (features.image.is_animation && capability.best_for.includes("animations")) {
          score += 0.2;
        }
      }
    }

    return Math.min(score, 1);
  }

  /**
   * 計算預測信心度
   */
  private calculateConfidence(scoredEngines: Array<{ engine: string; score: number }>): number {
    if (scoredEngines.length === 0) return 0;

    const first = scoredEngines[0];
    if (!first) return 0;
    if (scoredEngines.length === 1) return Math.min(first.score, 1);

    const topScore = first.score;
    const secondScore = scoredEngines[1]?.score ?? 0;

    // 使用相對優勢
    const gap = topScore - secondScore;
    const relativeGap = gap / (topScore + 0.001);

    const confidence = topScore * 0.7 + relativeGap * 0.3;
    return Math.min(Math.max(confidence, 0), 1);
  }

  /**
   * 取得格式可用的引擎列表
   */
  getAvailableEngines(format: string): string[] {
    const formatEngines = ENGINE_CAPABILITY_MATRIX[format];
    if (!formatEngines) return [];

    return Object.entries(formatEngines)
      .filter(([, cap]) => !cap.disallowed)
      .map(([name]) => name);
  }

  /**
   * 檢查引擎是否允許用於格式
   */
  isEngineAllowed(format: string, engine: string): boolean {
    const formatEngines = ENGINE_CAPABILITY_MATRIX[format];
    if (!formatEngines) return false;

    const capability = formatEngines[engine];
    return capability !== undefined && !capability.disallowed;
  }
}

// 導出單例
export const enginePredictionModel = new EnginePredictionModel();
