/**
 * 格式候選規則配置檔
 *
 * 本模組定義了基於檔案特徵的格式候選生成規則
 * 用於將 1000+ 格式空間降維為 10～30 個候選格式
 */

export interface FormatCandidateRule {
  /** 規則ID */
  id: string;
  /** 觸發條件 */
  conditions: {
    magic_family?: string;
    has_alpha?: boolean;
    is_animation?: boolean;
    input_ext?: string | string[];
    min_megapixels?: number;
    max_megapixels?: number;
    color_mode?: string;
  };
  /** 候選格式及其先驗權重 (0-1) */
  candidates: Record<string, number>;
  /** 規則原因碼 */
  reason_code: string;
  /** 規則優先級 (數字越大優先級越高) */
  priority: number;
}

/**
 * 格式候選規則庫
 * 規則按優先級排序，高優先級規則先匹配
 */
export const formatCandidateRules: FormatCandidateRule[] = [
  // ==================== 圖片格式規則 ====================
  {
    id: "image_alpha",
    conditions: { magic_family: "image", has_alpha: true },
    candidates: {
      png: 1.0,
      webp: 0.9,
      avif: 0.7,
      tiff: 0.4,
      gif: 0.3,
    },
    reason_code: "IMG_ALPHA",
    priority: 100,
  },
  {
    id: "image_animation",
    conditions: { magic_family: "image", is_animation: true },
    candidates: {
      gif: 1.0,
      webp: 0.9,
      mp4: 0.6,
      apng: 0.5,
    },
    reason_code: "IMG_ANIM",
    priority: 100,
  },
  {
    id: "image_high_res",
    conditions: { magic_family: "image", min_megapixels: 10 },
    candidates: {
      webp: 1.0,
      avif: 0.95,
      jpeg: 0.85,
      jxl: 0.8,
      png: 0.6,
      heif: 0.5,
    },
    reason_code: "IMG_HIGHRES",
    priority: 90,
  },
  {
    id: "image_photo_raw",
    conditions: {
      magic_family: "image",
      input_ext: ["raw", "cr2", "cr3", "nef", "arw", "dng", "orf", "rw2"],
    },
    candidates: {
      jpeg: 1.0,
      png: 0.8,
      tiff: 0.7,
      webp: 0.6,
    },
    reason_code: "IMG_RAW",
    priority: 95,
  },
  {
    id: "image_vector_input",
    conditions: {
      magic_family: "image",
      input_ext: ["svg", "eps", "ai", "emf", "wmf"],
    },
    candidates: {
      svg: 1.0,
      png: 0.9,
      pdf: 0.8,
      eps: 0.6,
    },
    reason_code: "IMG_VECTOR",
    priority: 95,
  },
  {
    id: "image_icon",
    conditions: {
      magic_family: "image",
      input_ext: ["ico", "icns", "cur"],
    },
    candidates: {
      png: 1.0,
      ico: 0.9,
      svg: 0.5,
    },
    reason_code: "IMG_ICON",
    priority: 95,
  },
  {
    id: "image_default",
    conditions: { magic_family: "image" },
    candidates: {
      png: 0.9,
      jpeg: 0.85,
      webp: 0.8,
      avif: 0.7,
      pdf: 0.4,
      gif: 0.3,
      tiff: 0.25,
      bmp: 0.2,
    },
    reason_code: "IMG_BASE",
    priority: 10,
  },

  // ==================== 影片格式規則 ====================
  {
    id: "video_default",
    conditions: { magic_family: "video" },
    candidates: {
      mp4: 1.0,
      webm: 0.8,
      mkv: 0.7,
      avi: 0.5,
      mov: 0.5,
      gif: 0.4,
      mp3: 0.35,
      wav: 0.25,
    },
    reason_code: "VID_BASE",
    priority: 10,
  },
  {
    id: "video_high_quality",
    conditions: {
      magic_family: "video",
      input_ext: ["mov", "prores", "mxf"],
    },
    candidates: {
      mp4: 1.0,
      mkv: 0.9,
      webm: 0.7,
      prores: 0.6,
    },
    reason_code: "VID_HQ",
    priority: 80,
  },

  // ==================== 音訊格式規則 ====================
  {
    id: "audio_default",
    conditions: { magic_family: "audio" },
    candidates: {
      mp3: 1.0,
      wav: 0.8,
      flac: 0.7,
      aac: 0.65,
      ogg: 0.6,
      m4a: 0.55,
      opus: 0.5,
    },
    reason_code: "AUD_BASE",
    priority: 10,
  },
  {
    id: "audio_lossless",
    conditions: {
      magic_family: "audio",
      input_ext: ["flac", "wav", "alac", "ape", "aiff"],
    },
    candidates: {
      flac: 1.0,
      wav: 0.9,
      mp3: 0.8,
      aac: 0.7,
      alac: 0.6,
    },
    reason_code: "AUD_LOSSLESS",
    priority: 80,
  },

  // ==================== 文件格式規則 ====================
  {
    id: "document_office",
    conditions: {
      magic_family: "document",
      input_ext: ["doc", "docx", "odt", "rtf"],
    },
    candidates: {
      pdf: 1.0,
      docx: 0.9,
      odt: 0.7,
      txt: 0.5,
      html: 0.4,
      md: 0.3,
    },
    reason_code: "DOC_OFFICE",
    priority: 80,
  },
  {
    id: "document_spreadsheet",
    conditions: {
      magic_family: "document",
      input_ext: ["xls", "xlsx", "ods", "csv"],
    },
    candidates: {
      xlsx: 1.0,
      csv: 0.9,
      ods: 0.7,
      pdf: 0.6,
      json: 0.4,
    },
    reason_code: "DOC_SHEET",
    priority: 80,
  },
  {
    id: "document_presentation",
    conditions: {
      magic_family: "document",
      input_ext: ["ppt", "pptx", "odp", "key"],
    },
    candidates: {
      pdf: 1.0,
      pptx: 0.9,
      odp: 0.7,
      png: 0.5,
    },
    reason_code: "DOC_PRES",
    priority: 80,
  },
  {
    id: "document_pdf",
    conditions: {
      magic_family: "document",
      input_ext: ["pdf"],
    },
    candidates: {
      docx: 0.9,
      txt: 0.85,
      png: 0.8,
      jpeg: 0.7,
      html: 0.6,
      md: 0.55,
      epub: 0.4,
    },
    reason_code: "DOC_PDF",
    priority: 85,
  },
  {
    id: "document_ebook",
    conditions: {
      magic_family: "document",
      input_ext: ["epub", "mobi", "azw3", "fb2"],
    },
    candidates: {
      epub: 1.0,
      mobi: 0.9,
      pdf: 0.85,
      azw3: 0.7,
      txt: 0.5,
    },
    reason_code: "DOC_EBOOK",
    priority: 80,
  },
  {
    id: "document_markdown",
    conditions: {
      magic_family: "document",
      input_ext: ["md", "markdown", "rst", "txt"],
    },
    candidates: {
      pdf: 1.0,
      html: 0.9,
      docx: 0.8,
      txt: 0.7,
      epub: 0.5,
    },
    reason_code: "DOC_MD",
    priority: 80,
  },
  {
    id: "document_default",
    conditions: { magic_family: "document" },
    candidates: {
      pdf: 1.0,
      docx: 0.8,
      txt: 0.7,
      html: 0.5,
    },
    reason_code: "DOC_BASE",
    priority: 10,
  },

  // ==================== 資料格式規則 ====================
  {
    id: "data_json",
    conditions: {
      magic_family: "data",
      input_ext: ["json"],
    },
    candidates: {
      yaml: 1.0,
      xml: 0.8,
      csv: 0.7,
      toml: 0.6,
    },
    reason_code: "DATA_JSON",
    priority: 80,
  },
  {
    id: "data_yaml",
    conditions: {
      magic_family: "data",
      input_ext: ["yaml", "yml"],
    },
    candidates: {
      json: 1.0,
      xml: 0.7,
      toml: 0.6,
    },
    reason_code: "DATA_YAML",
    priority: 80,
  },
  {
    id: "data_xml",
    conditions: {
      magic_family: "data",
      input_ext: ["xml"],
    },
    candidates: {
      json: 1.0,
      yaml: 0.8,
      csv: 0.5,
    },
    reason_code: "DATA_XML",
    priority: 80,
  },
  {
    id: "data_default",
    conditions: { magic_family: "data" },
    candidates: {
      json: 1.0,
      csv: 0.8,
      yaml: 0.7,
      xml: 0.6,
    },
    reason_code: "DATA_BASE",
    priority: 10,
  },

  // ==================== 3D 模型格式規則 ====================
  {
    id: "model3d_default",
    conditions: { magic_family: "model3d" },
    candidates: {
      obj: 1.0,
      fbx: 0.9,
      gltf: 0.85,
      glb: 0.8,
      stl: 0.7,
      dae: 0.6,
      ply: 0.5,
    },
    reason_code: "3D_BASE",
    priority: 10,
  },

  // ==================== 壓縮檔規則 ====================
  {
    id: "archive_default",
    conditions: { magic_family: "archive" },
    candidates: {
      zip: 1.0,
      tar: 0.8,
      "7z": 0.75,
      rar: 0.6,
    },
    reason_code: "ARC_BASE",
    priority: 10,
  },

  // ==================== 字型格式規則 ====================
  {
    id: "font_default",
    conditions: { magic_family: "font" },
    candidates: {
      woff2: 1.0,
      woff: 0.9,
      ttf: 0.85,
      otf: 0.8,
      eot: 0.5,
    },
    reason_code: "FONT_BASE",
    priority: 10,
  },
];

/**
 * 根據檔案特徵生成候選格式
 * @param features 檔案特徵
 * @returns 候選格式及權重
 */
export function generateCandidates(features: {
  input_ext: string;
  magic_family: string;
  has_alpha?: boolean;
  is_animation?: boolean;
  megapixels?: number;
  color_mode?: string;
}): { candidates: Record<string, number>; matched_rules: string[] } {
  const sortedRules = [...formatCandidateRules].sort((a, b) => b.priority - a.priority);
  const mergedCandidates: Record<string, number> = {};
  const matchedRules: string[] = [];

  for (const rule of sortedRules) {
    if (matchesConditions(features, rule.conditions)) {
      matchedRules.push(rule.id);

      // 合併候選格式，取較高權重
      for (const [format, weight] of Object.entries(rule.candidates)) {
        if (!mergedCandidates[format] || mergedCandidates[format] < weight) {
          mergedCandidates[format] = weight;
        }
      }
    }
  }

  // 排除自身格式
  delete mergedCandidates[features.input_ext];

  return { candidates: mergedCandidates, matched_rules: matchedRules };
}

/**
 * 檢查特徵是否匹配規則條件
 */
function matchesConditions(
  features: {
    input_ext: string;
    magic_family: string;
    has_alpha?: boolean;
    is_animation?: boolean;
    megapixels?: number;
    color_mode?: string;
  },
  conditions: FormatCandidateRule["conditions"],
): boolean {
  // 檢查 magic_family
  if (conditions.magic_family && features.magic_family !== conditions.magic_family) {
    return false;
  }

  // 檢查 has_alpha
  if (conditions.has_alpha !== undefined && features.has_alpha !== conditions.has_alpha) {
    return false;
  }

  // 檢查 is_animation
  if (conditions.is_animation !== undefined && features.is_animation !== conditions.is_animation) {
    return false;
  }

  // 檢查 input_ext
  if (conditions.input_ext) {
    const extList = Array.isArray(conditions.input_ext)
      ? conditions.input_ext
      : [conditions.input_ext];
    if (!extList.includes(features.input_ext)) {
      return false;
    }
  }

  // 檢查 min_megapixels
  if (conditions.min_megapixels !== undefined) {
    if (!features.megapixels || features.megapixels < conditions.min_megapixels) {
      return false;
    }
  }

  // 檢查 max_megapixels
  if (conditions.max_megapixels !== undefined) {
    if (!features.megapixels || features.megapixels > conditions.max_megapixels) {
      return false;
    }
  }

  // 檢查 color_mode
  if (conditions.color_mode && features.color_mode !== conditions.color_mode) {
    return false;
  }

  return true;
}
