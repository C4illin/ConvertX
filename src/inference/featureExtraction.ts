/**
 * 檔案特徵抽取模組
 *
 * 從上傳的檔案中提取用於格式推斷的特徵
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { stat } from "node:fs/promises";

const execFileAsync = promisify(execFile);

/**
 * 基礎檔案特徵
 */
export interface BaseFileFeatures {
  /** 輸入檔案副檔名 (不含點) */
  input_ext: string;
  /** MIME 類型 */
  mime_type: string;
  /** 檔案大小 (KB) */
  file_size_kb: number;
  /** 魔數家族 (image/video/audio/document/data/model3d/archive/font/unknown) */
  magic_family: string;
  /** 上傳時段 (morning/afternoon/evening/night) */
  upload_hour_bucket: string;
}

/**
 * 圖片專用特徵
 */
export interface ImageFeatures {
  /** 寬度 (像素) */
  width: number;
  /** 高度 (像素) */
  height: number;
  /** 百萬像素 */
  megapixels: number;
  /** 是否有透明通道 */
  has_alpha: boolean;
  /** 是否為動畫 */
  is_animation: boolean;
  /** 色彩模式 (rgb/rgba/cmyk/grayscale) */
  color_mode: string;
  /** 長寬比描述 */
  aspect_ratio: string;
}

/**
 * 完整檔案特徵
 */
export interface FileFeatures extends BaseFileFeatures {
  /** 圖片專用特徵 (僅當 magic_family === 'image' 時存在) */
  image?: ImageFeatures;
}

/**
 * 副檔名到 magic_family 的映射
 */
const EXT_TO_FAMILY: Record<string, string> = {
  // 圖片
  jpg: "image",
  jpeg: "image",
  png: "image",
  gif: "image",
  webp: "image",
  avif: "image",
  heic: "image",
  heif: "image",
  bmp: "image",
  tiff: "image",
  tif: "image",
  svg: "image",
  ico: "image",
  icns: "image",
  psd: "image",
  raw: "image",
  cr2: "image",
  cr3: "image",
  nef: "image",
  arw: "image",
  dng: "image",
  orf: "image",
  rw2: "image",
  jxl: "image",
  apng: "image",
  eps: "image",
  ai: "image",
  emf: "image",
  wmf: "image",
  cur: "image",

  // 影片
  mp4: "video",
  mkv: "video",
  avi: "video",
  mov: "video",
  webm: "video",
  flv: "video",
  wmv: "video",
  m4v: "video",
  "3gp": "video",
  mpeg: "video",
  mpg: "video",
  mts: "video",
  m2ts: "video",
  vob: "video",
  ogv: "video",
  prores: "video",
  mxf: "video",

  // 音訊
  mp3: "audio",
  wav: "audio",
  flac: "audio",
  aac: "audio",
  ogg: "audio",
  m4a: "audio",
  wma: "audio",
  opus: "audio",
  aiff: "audio",
  ape: "audio",
  alac: "audio",
  mid: "audio",
  midi: "audio",

  // 文件
  pdf: "document",
  doc: "document",
  docx: "document",
  odt: "document",
  rtf: "document",
  txt: "document",
  xls: "document",
  xlsx: "document",
  ods: "document",
  ppt: "document",
  pptx: "document",
  odp: "document",
  epub: "document",
  mobi: "document",
  azw3: "document",
  fb2: "document",
  md: "document",
  markdown: "document",
  rst: "document",
  tex: "document",
  html: "document",
  htm: "document",
  key: "document",
  pages: "document",
  numbers: "document",
  msg: "document",
  eml: "document",

  // 資料
  json: "data",
  yaml: "data",
  yml: "data",
  xml: "data",
  csv: "data",
  toml: "data",
  ini: "data",
  vcf: "data",

  // 3D 模型
  obj: "model3d",
  fbx: "model3d",
  gltf: "model3d",
  glb: "model3d",
  stl: "model3d",
  dae: "model3d",
  ply: "model3d",
  "3ds": "model3d",
  blend: "model3d",

  // 壓縮檔
  zip: "archive",
  tar: "archive",
  gz: "archive",
  "7z": "archive",
  rar: "archive",
  bz2: "archive",
  xz: "archive",

  // 字型
  ttf: "font",
  otf: "font",
  woff: "font",
  woff2: "font",
  eot: "font",
};

/**
 * 副檔名到 MIME 類型的映射
 */
const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  heic: "image/heic",
  heif: "image/heif",
  bmp: "image/bmp",
  tiff: "image/tiff",
  tif: "image/tiff",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  psd: "image/vnd.adobe.photoshop",
  jxl: "image/jxl",

  mp4: "video/mp4",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  mov: "video/quicktime",
  webm: "video/webm",
  flv: "video/x-flv",

  mp3: "audio/mpeg",
  wav: "audio/wav",
  flac: "audio/flac",
  aac: "audio/aac",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  opus: "audio/opus",

  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  json: "application/json",
  xml: "application/xml",
  csv: "text/csv",
  txt: "text/plain",
  html: "text/html",
  md: "text/markdown",
};

/**
 * 根據小時數取得時段
 */
function getHourBucket(hour: number): string {
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 22) return "evening";
  return "night";
}

/**
 * 計算長寬比描述
 */
function getAspectRatio(width: number, height: number): string {
  const ratio = width / height;
  if (Math.abs(ratio - 1) < 0.05) return "1:1";
  if (Math.abs(ratio - 4 / 3) < 0.1) return "4:3";
  if (Math.abs(ratio - 3 / 4) < 0.1) return "3:4";
  if (Math.abs(ratio - 16 / 9) < 0.1) return "16:9";
  if (Math.abs(ratio - 9 / 16) < 0.1) return "9:16";
  if (Math.abs(ratio - 3 / 2) < 0.1) return "3:2";
  if (Math.abs(ratio - 2 / 3) < 0.1) return "2:3";
  if (ratio > 2) return "panorama";
  if (ratio < 0.5) return "tall";
  return "other";
}

/**
 * 使用 ImageMagick 提取圖片特徵
 */
async function extractImageFeaturesWithImageMagick(
  filePath: string,
): Promise<ImageFeatures | null> {
  try {
    const { stdout } = await execFileAsync("identify", [
      "-format",
      "%w|%h|%[channels]|%n|%[colorspace]",
      filePath,
    ]);

    const parts = stdout.trim().split("|");
    if (parts.length < 5) return null;

    const width = parseInt(parts[0] ?? "0", 10);
    const height = parseInt(parts[1] ?? "0", 10);
    const channels = parts[2] ?? "";
    const frameCount = parseInt(parts[3] ?? "0", 10);
    const colorspace = (parts[4] ?? "").toLowerCase();

    const megapixels = (width * height) / 1_000_000;
    const has_alpha = channels.includes("a") || channels.includes("alpha");
    const is_animation = frameCount > 1;

    let color_mode = "rgb";
    if (colorspace.includes("gray")) {
      color_mode = "grayscale";
    } else if (colorspace.includes("cmyk")) {
      color_mode = "cmyk";
    } else if (has_alpha) {
      color_mode = "rgba";
    }

    return {
      width,
      height,
      megapixels: Math.round(megapixels * 100) / 100,
      has_alpha,
      is_animation,
      color_mode,
      aspect_ratio: getAspectRatio(width, height),
    };
  } catch (error) {
    console.warn("ImageMagick identify failed, trying vips...", error);
    return null;
  }
}

/**
 * 使用 vips 提取圖片特徵 (備用)
 */
async function extractImageFeaturesWithVips(filePath: string): Promise<ImageFeatures | null> {
  try {
    const { stdout } = await execFileAsync("vipsheader", ["-a", filePath]);

    const lines = stdout.trim().split("\n");
    let width = 0,
      height = 0,
      bands = 3;

    for (const line of lines) {
      const [key, value] = line.split(":").map((s) => s.trim());
      if (key === "width" && value) width = parseInt(value, 10);
      if (key === "height" && value) height = parseInt(value, 10);
      if (key === "bands" && value) bands = parseInt(value, 10);
    }

    if (width === 0 || height === 0) return null;

    const megapixels = (width * height) / 1_000_000;
    const has_alpha = bands === 4;

    return {
      width,
      height,
      megapixels: Math.round(megapixels * 100) / 100,
      has_alpha,
      is_animation: false, // vipsheader doesn't easily detect animation
      color_mode: has_alpha ? "rgba" : "rgb",
      aspect_ratio: getAspectRatio(width, height),
    };
  } catch (error) {
    console.warn("vipsheader failed:", error);
    return null;
  }
}

/**
 * 提取圖片特徵
 */
async function extractImageFeatures(filePath: string): Promise<ImageFeatures | null> {
  // 優先使用 ImageMagick
  let features = await extractImageFeaturesWithImageMagick(filePath);
  if (features) return features;

  // 備用使用 vips
  features = await extractImageFeaturesWithVips(filePath);
  return features;
}

/**
 * 從檔案路徑提取完整特徵
 */
export async function extractFeatures(filePath: string): Promise<FileFeatures> {
  // 取得副檔名
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";

  // 取得檔案大小
  let fileSizeKb = 0;
  try {
    const stats = await stat(filePath);
    fileSizeKb = Math.round(stats.size / 1024);
  } catch {
    console.warn("Could not stat file:", filePath);
  }

  // 決定 magic_family
  const magicFamily = EXT_TO_FAMILY[ext] ?? "unknown";

  // 決定 MIME 類型
  const mimeType = EXT_TO_MIME[ext] ?? "application/octet-stream";

  // 取得時段
  const uploadHourBucket = getHourBucket(new Date().getHours());

  const baseFeatures: FileFeatures = {
    input_ext: ext,
    mime_type: mimeType,
    file_size_kb: fileSizeKb,
    magic_family: magicFamily,
    upload_hour_bucket: uploadHourBucket,
  };

  // 如果是圖片，提取圖片特徵
  if (magicFamily === "image") {
    const imageFeatures = await extractImageFeatures(filePath);
    if (imageFeatures) {
      baseFeatures.image = imageFeatures;
    }
  }

  return baseFeatures;
}

/**
 * 從副檔名快速提取基礎特徵 (不需要實際檔案)
 * 用於前端快速推斷
 */
export function extractFeaturesFromExtension(ext: string): Omit<FileFeatures, "file_size_kb"> {
  const cleanExt = ext.toLowerCase().replace(/^\./, "");
  const magicFamily = EXT_TO_FAMILY[cleanExt] ?? "unknown";
  const mimeType = EXT_TO_MIME[cleanExt] ?? "application/octet-stream";
  const uploadHourBucket = getHourBucket(new Date().getHours());

  return {
    input_ext: cleanExt,
    mime_type: mimeType,
    magic_family: magicFamily,
    upload_hour_bucket: uploadHourBucket,
  };
}
