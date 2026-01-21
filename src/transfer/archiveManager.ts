/**
 * Contents.CN 封裝管理器
 * 
 * 統一處理多檔輸出的封裝：
 * - 唯一允許格式：.tar
 * - 禁止：.tar.gz, .tgz, .zip 等
 */

import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import * as tar from "tar";
import { ALLOWED_ARCHIVE_FORMAT, FORBIDDEN_ARCHIVE_FORMATS } from "./constants";

/**
 * 驗證封裝格式是否合法
 */
export function validateArchiveFormat(fileName: string): boolean {
  const lowerName = fileName.toLowerCase();
  
  // 檢查是否使用禁止的格式
  for (const forbidden of FORBIDDEN_ARCHIVE_FORMATS) {
    if (lowerName.endsWith(forbidden)) {
      return false;
    }
  }
  
  // 檢查是否是允許的格式
  return lowerName.endsWith(ALLOWED_ARCHIVE_FORMAT);
}

/**
 * 取得正確的封裝檔名（強制使用 .tar）
 */
export function getArchiveFileName(baseName: string): string {
  const lowerName = baseName.toLowerCase();
  
  // 移除任何禁止的副檔名
  let cleanName = baseName;
  for (const forbidden of FORBIDDEN_ARCHIVE_FORMATS) {
    if (lowerName.endsWith(forbidden)) {
      cleanName = baseName.slice(0, -forbidden.length);
      break;
    }
  }
  
  // 如果已經是 .tar 結尾，直接返回
  if (cleanName.toLowerCase().endsWith(ALLOWED_ARCHIVE_FORMAT)) {
    return cleanName;
  }
  
  // 否則加上 .tar
  return `${cleanName}${ALLOWED_ARCHIVE_FORMAT}`;
}

/**
 * 建立 .tar 封裝（不壓縮）
 * 
 * @param sourceDir - 來源目錄
 * @param outputPath - 輸出的 .tar 檔案路徑
 * @param options - 額外選項
 */
export async function createTarArchive(
  sourceDir: string,
  outputPath: string,
  options: {
    filter?: (path: string) => boolean;
    prefix?: string;
  } = {}
): Promise<string> {
  // 強制確保輸出是 .tar 格式
  const finalOutputPath = getArchiveFileName(outputPath);
  
  // 確保輸出目錄存在
  const outputDir = join(finalOutputPath, "..");
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // 取得要封裝的檔案列表
  const files = readdirSync(sourceDir);
  
  // 預設過濾器：排除其他 tar 檔案
  const defaultFilter = (path: string) => !path.match(/\.tar$/i);
  const filter = options.filter || defaultFilter;

  await tar.create(
    {
      file: finalOutputPath,
      cwd: sourceDir,
      filter: filter,
      // 不使用 gzip 壓縮
      gzip: false,
    },
    files.filter(f => filter(f))
  );

  console.log(`Created tar archive: ${finalOutputPath}`);
  return finalOutputPath;
}

/**
 * 建立用於多檔輸出的 .tar 封裝
 * 
 * @param outputDir - 輸出目錄（包含多個轉換結果）
 * @param jobId - 任務 ID
 */
export async function createJobArchive(outputDir: string, jobId: string): Promise<string> {
  const archiveName = `converted_files_${jobId}.tar`;
  const archivePath = join(outputDir, archiveName);

  await createTarArchive(outputDir, archivePath, {
    filter: (path) => !path.endsWith(".tar"), // 排除其他 tar 檔案
  });

  return archivePath;
}

/**
 * 從目錄封裝 MinerU 等多檔輸出引擎的結果
 * 
 * @param mineruOutputDir - MinerU 輸出目錄
 * @param targetPath - 目標 .tar 路徑
 */
export async function createConverterArchive(
  converterOutputDir: string,
  targetPath: string
): Promise<string> {
  // 確保輸出使用 .tar 格式
  const tarPath = getArchiveFileName(targetPath);
  
  await createTarArchive(converterOutputDir, tarPath);
  
  return tarPath;
}

/**
 * 取得封裝檔案資訊
 */
export function getArchiveInfo(archivePath: string): {
  exists: boolean;
  size: number;
  fileName: string;
} | null {
  if (!existsSync(archivePath)) {
    return null;
  }

  const stats = statSync(archivePath);
  return {
    exists: true,
    size: stats.size,
    fileName: basename(archivePath),
  };
}
