/**
 * Token Lexicon - 格式搜尋字詞詞庫
 *
 * 定義所有可搜尋的格式 token，用於：
 * 1. 標準化格式名稱
 * 2. 支援別名搜尋
 * 3. 分類格式家族
 */

/**
 * 格式 Token 定義
 */
export interface FormatToken {
  /** 主要 token (用於搜尋) */
  token: string;
  /** 格式家族 */
  family: "image" | "video" | "audio" | "document" | "data" | "3d" | "archive" | "font" | "other";
  /** 別名列表 (也會觸發搜尋匹配) */
  aliases: string[];
  /** 顯示名稱 */
  display_name: string;
  /** 是否為常用格式 */
  is_common: boolean;
}

/**
 * Format Lexicon - 所有可搜尋的格式 token
 */
export const FORMAT_LEXICON: FormatToken[] = [
  // ==================== 圖片格式 ====================
  {
    token: "png",
    family: "image",
    aliases: ["portable network graphics"],
    display_name: "PNG",
    is_common: true,
  },
  {
    token: "jpeg",
    family: "image",
    aliases: ["jpg", "jpe", "jfif"],
    display_name: "JPEG",
    is_common: true,
  },
  {
    token: "webp",
    family: "image",
    aliases: [],
    display_name: "WebP",
    is_common: true,
  },
  {
    token: "gif",
    family: "image",
    aliases: ["graphics interchange format"],
    display_name: "GIF",
    is_common: true,
  },
  {
    token: "avif",
    family: "image",
    aliases: ["av1 image"],
    display_name: "AVIF",
    is_common: true,
  },
  {
    token: "svg",
    family: "image",
    aliases: ["svgz", "scalable vector graphics"],
    display_name: "SVG",
    is_common: true,
  },
  {
    token: "ico",
    family: "image",
    aliases: ["icon", "favicon"],
    display_name: "ICO",
    is_common: false,
  },
  {
    token: "bmp",
    family: "image",
    aliases: ["bitmap", "dib"],
    display_name: "BMP",
    is_common: false,
  },
  {
    token: "tiff",
    family: "image",
    aliases: ["tif"],
    display_name: "TIFF",
    is_common: false,
  },
  {
    token: "heif",
    family: "image",
    aliases: ["heic", "heics"],
    display_name: "HEIF",
    is_common: false,
  },
  {
    token: "jxl",
    family: "image",
    aliases: ["jpeg xl"],
    display_name: "JPEG XL",
    is_common: false,
  },
  {
    token: "psd",
    family: "image",
    aliases: ["photoshop"],
    display_name: "PSD",
    is_common: false,
  },
  {
    token: "eps",
    family: "image",
    aliases: ["encapsulated postscript"],
    display_name: "EPS",
    is_common: false,
  },

  // ==================== 影片格式 ====================
  {
    token: "mp4",
    family: "video",
    aliases: ["m4v", "mpeg4"],
    display_name: "MP4",
    is_common: true,
  },
  {
    token: "webm",
    family: "video",
    aliases: [],
    display_name: "WebM",
    is_common: true,
  },
  {
    token: "mkv",
    family: "video",
    aliases: ["matroska"],
    display_name: "MKV",
    is_common: true,
  },
  {
    token: "avi",
    family: "video",
    aliases: [],
    display_name: "AVI",
    is_common: false,
  },
  {
    token: "mov",
    family: "video",
    aliases: ["quicktime"],
    display_name: "MOV",
    is_common: false,
  },

  // ==================== 音訊格式 ====================
  {
    token: "mp3",
    family: "audio",
    aliases: ["mpeg audio layer 3"],
    display_name: "MP3",
    is_common: true,
  },
  {
    token: "wav",
    family: "audio",
    aliases: ["wave", "riff"],
    display_name: "WAV",
    is_common: true,
  },
  {
    token: "flac",
    family: "audio",
    aliases: ["free lossless audio codec"],
    display_name: "FLAC",
    is_common: true,
  },
  {
    token: "aac",
    family: "audio",
    aliases: ["m4a"],
    display_name: "AAC",
    is_common: false,
  },
  {
    token: "ogg",
    family: "audio",
    aliases: ["oga", "vorbis"],
    display_name: "OGG",
    is_common: false,
  },
  {
    token: "opus",
    family: "audio",
    aliases: [],
    display_name: "Opus",
    is_common: false,
  },

  // ==================== 文件格式 ====================
  {
    token: "pdf",
    family: "document",
    aliases: ["portable document format"],
    display_name: "PDF",
    is_common: true,
  },
  {
    token: "docx",
    family: "document",
    aliases: ["doc", "word"],
    display_name: "DOCX",
    is_common: true,
  },
  {
    token: "txt",
    family: "document",
    aliases: ["text", "plain text"],
    display_name: "TXT",
    is_common: true,
  },
  {
    token: "md",
    family: "document",
    aliases: ["markdown"],
    display_name: "Markdown",
    is_common: true,
  },
  {
    token: "html",
    family: "document",
    aliases: ["htm", "webpage"],
    display_name: "HTML",
    is_common: false,
  },
  {
    token: "rtf",
    family: "document",
    aliases: ["rich text"],
    display_name: "RTF",
    is_common: false,
  },
  {
    token: "epub",
    family: "document",
    aliases: ["ebook"],
    display_name: "EPUB",
    is_common: false,
  },
  {
    token: "mobi",
    family: "document",
    aliases: ["kindle"],
    display_name: "MOBI",
    is_common: false,
  },
  {
    token: "xlsx",
    family: "document",
    aliases: ["xls", "excel", "spreadsheet"],
    display_name: "XLSX",
    is_common: true,
  },
  {
    token: "pptx",
    family: "document",
    aliases: ["ppt", "powerpoint", "presentation"],
    display_name: "PPTX",
    is_common: false,
  },

  // ==================== 資料格式 ====================
  {
    token: "json",
    family: "data",
    aliases: ["javascript object notation"],
    display_name: "JSON",
    is_common: true,
  },
  {
    token: "yaml",
    family: "data",
    aliases: ["yml"],
    display_name: "YAML",
    is_common: true,
  },
  {
    token: "xml",
    family: "data",
    aliases: ["extensible markup language"],
    display_name: "XML",
    is_common: false,
  },
  {
    token: "csv",
    family: "data",
    aliases: ["comma separated values"],
    display_name: "CSV",
    is_common: true,
  },
  {
    token: "toml",
    family: "data",
    aliases: [],
    display_name: "TOML",
    is_common: false,
  },

  // ==================== 3D 格式 ====================
  {
    token: "obj",
    family: "3d",
    aliases: ["wavefront"],
    display_name: "OBJ",
    is_common: true,
  },
  {
    token: "stl",
    family: "3d",
    aliases: ["stereolithography"],
    display_name: "STL",
    is_common: true,
  },
  {
    token: "gltf",
    family: "3d",
    aliases: ["glb", "gl transmission format"],
    display_name: "glTF",
    is_common: true,
  },
  {
    token: "fbx",
    family: "3d",
    aliases: ["filmbox"],
    display_name: "FBX",
    is_common: false,
  },
  {
    token: "dae",
    family: "3d",
    aliases: ["collada"],
    display_name: "DAE",
    is_common: false,
  },
  {
    token: "ply",
    family: "3d",
    aliases: ["polygon file format"],
    display_name: "PLY",
    is_common: false,
  },

  // ==================== 壓縮格式 ====================
  {
    token: "zip",
    family: "archive",
    aliases: [],
    display_name: "ZIP",
    is_common: true,
  },
  {
    token: "tar",
    family: "archive",
    aliases: ["tarball"],
    display_name: "TAR",
    is_common: false,
  },
  {
    token: "7z",
    family: "archive",
    aliases: ["7zip"],
    display_name: "7Z",
    is_common: false,
  },

  // ==================== 字體格式 ====================
  {
    token: "ttf",
    family: "font",
    aliases: ["truetype"],
    display_name: "TTF",
    is_common: true,
  },
  {
    token: "otf",
    family: "font",
    aliases: ["opentype"],
    display_name: "OTF",
    is_common: true,
  },
  {
    token: "woff",
    family: "font",
    aliases: ["web open font format"],
    display_name: "WOFF",
    is_common: false,
  },
  {
    token: "woff2",
    family: "font",
    aliases: [],
    display_name: "WOFF2",
    is_common: false,
  },
];

// 建立索引
const TOKEN_INDEX = new Map<string, FormatToken>();
const ALIAS_INDEX = new Map<string, FormatToken>();

for (const token of FORMAT_LEXICON) {
  TOKEN_INDEX.set(token.token, token);
  for (const alias of token.aliases) {
    ALIAS_INDEX.set(alias.toLowerCase(), token);
  }
}

/**
 * 根據 token 取得格式定義
 */
export function getTokenByName(name: string): FormatToken | undefined {
  const lower = name.toLowerCase();
  return TOKEN_INDEX.get(lower) ?? ALIAS_INDEX.get(lower);
}

/**
 * 取得指定家族的所有 token
 */
export function getTokensByFamily(family: FormatToken["family"]): FormatToken[] {
  return FORMAT_LEXICON.filter((t) => t.family === family);
}

/**
 * 取得所有常用格式
 */
export function getCommonTokens(): FormatToken[] {
  return FORMAT_LEXICON.filter((t) => t.is_common);
}

/**
 * 檢查是否為有效的 token
 */
export function isValidToken(token: string): boolean {
  return TOKEN_INDEX.has(token.toLowerCase());
}

/**
 * 標準化 token (將別名轉換為主要 token)
 */
export function normalizeToken(input: string): string {
  const lower = input.toLowerCase();
  const token = TOKEN_INDEX.get(lower) ?? ALIAS_INDEX.get(lower);
  return token?.token ?? lower;
}
