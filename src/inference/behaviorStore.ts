/**
 * 使用者行為資料儲存模組
 *
 * 記錄使用者轉檔行為，用於訓練預測模型
 */

import db from "../db/db";

// ==================== 資料型別定義 ====================

/**
 * 轉檔完成事件
 */
export interface ConversionEvent {
  /** 事件類型 */
  event: "conversion_completed";
  /** 使用者 ID */
  user_id: number;
  /** 輸入副檔名 */
  input_ext: string;
  /** 使用者搜尋的格式 */
  searched_format: string;
  /** 選擇的轉換引擎 */
  selected_engine: string;
  /** 是否成功 */
  success: boolean;
  /** 轉檔耗時 (毫秒) */
  duration_ms: number;
  /** 檔案大小 (KB) */
  file_size_kb?: number;
  /** 圖片百萬像素 (如適用) */
  megapixels?: number;
  /** 時間戳 */
  timestamp: string;
}

/**
 * 推薦拒絕事件
 */
export interface DismissEvent {
  /** 事件類型 */
  event: "recommendation_dismissed";
  /** 使用者 ID */
  user_id: number;
  /** 輸入副檔名 */
  input_ext: string;
  /** 被拒絕的推薦格式 */
  dismissed_format: string;
  /** 被拒絕的推薦引擎 */
  dismissed_engine?: string;
  /** 時間戳 */
  timestamp: string;
}

/**
 * 使用者 Profile
 */
export interface UserProfile {
  /** 使用者 ID */
  user_id: number;
  /** 格式偏好 (key: "input->output", value: 使用頻率 0-1) */
  format_preferences: Record<string, number>;
  /** 引擎偏好 (key: 輸出格式, value: {引擎: 使用頻率}) */
  engine_preferences: Record<string, Record<string, number>>;
  /** 最近使用的格式 (最新在前) */
  recent_formats: string[];
  /** 總轉檔次數 */
  total_conversions: number;
  /** 最後更新時間 */
  last_updated: string;
}

/**
 * 全域格式轉換統計
 */
export interface FormatConversionStats {
  /** 格式流行度 (key: 格式, value: 使用率 0-1) */
  format_popularity: Record<string, number>;
  /** 轉換路徑統計 (key: "input->output", value: 次數) */
  conversion_paths: Record<string, number>;
  /** 引擎成功率 (key: 引擎, value: 成功率 0-1) */
  engine_success_rates: Record<string, number>;
  /** 統計時間範圍 */
  stats_period: {
    start: string;
    end: string;
  };
}

// ==================== 資料庫初始化 ====================

/**
 * 初始化行為資料表
 */
export function initBehaviorTables(): void {
  // 轉檔事件表
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversion_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      input_ext TEXT NOT NULL,
      searched_format TEXT NOT NULL,
      selected_engine TEXT NOT NULL,
      success INTEGER NOT NULL,
      duration_ms INTEGER NOT NULL,
      file_size_kb INTEGER,
      megapixels REAL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // 推薦拒絕事件表
  db.exec(`
    CREATE TABLE IF NOT EXISTS dismiss_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      input_ext TEXT NOT NULL,
      dismissed_format TEXT NOT NULL,
      dismissed_engine TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // 使用者 Profile 快取表
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id INTEGER PRIMARY KEY,
      format_preferences TEXT NOT NULL,
      engine_preferences TEXT NOT NULL,
      recent_formats TEXT NOT NULL,
      total_conversions INTEGER NOT NULL,
      last_updated TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // 建立索引以加速查詢
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_conversion_events_user 
    ON conversion_events(user_id, timestamp DESC);
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_dismiss_events_user 
    ON dismiss_events(user_id, timestamp DESC);
  `);

  console.log("✅ Behavior tables initialized");
}

// ==================== 事件記錄 ====================

/**
 * 記錄轉檔完成事件
 */
export function logConversionEvent(event: Omit<ConversionEvent, "event" | "timestamp">): void {
  const timestamp = new Date().toISOString();

  db.query(
    `
    INSERT INTO conversion_events 
    (user_id, input_ext, searched_format, selected_engine, success, duration_ms, file_size_kb, megapixels, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(
    event.user_id,
    event.input_ext,
    event.searched_format,
    event.selected_engine,
    event.success ? 1 : 0,
    event.duration_ms,
    event.file_size_kb ?? null,
    event.megapixels ?? null,
    timestamp,
  );

  // 異步更新使用者 Profile
  updateUserProfileAsync(event.user_id);
}

/**
 * 記錄推薦拒絕事件
 */
export function logDismissEvent(event: Omit<DismissEvent, "event" | "timestamp">): void {
  const timestamp = new Date().toISOString();

  db.query(
    `
    INSERT INTO dismiss_events 
    (user_id, input_ext, dismissed_format, dismissed_engine, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `,
  ).run(
    event.user_id,
    event.input_ext,
    event.dismissed_format,
    event.dismissed_engine ?? null,
    timestamp,
  );
}

// ==================== 使用者 Profile 管理 ====================

/**
 * 異步更新使用者 Profile (防止阻塞主流程)
 */
function updateUserProfileAsync(userId: number): void {
  // 使用 setImmediate 或 setTimeout 避免阻塞
  setTimeout(() => {
    try {
      rebuildUserProfile(userId);
    } catch (error) {
      console.error("Failed to update user profile:", error);
    }
  }, 100);
}

/**
 * 重建使用者 Profile
 */
export function rebuildUserProfile(userId: number): UserProfile {
  // 取得最近 30 天的轉檔記錄
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  interface ConversionRow {
    input_ext: string;
    searched_format: string;
    selected_engine: string;
    success: number;
    timestamp: string;
  }

  const events = db
    .query(
      `
    SELECT input_ext, searched_format, selected_engine, success, timestamp
    FROM conversion_events
    WHERE user_id = ? AND timestamp > ?
    ORDER BY timestamp DESC
  `,
    )
    .all(userId, thirtyDaysAgo) as ConversionRow[];

  // 計算格式偏好
  const formatCounts: Record<string, number> = {};
  const engineCounts: Record<string, Record<string, number>> = {};
  const recentFormats: string[] = [];
  let totalConversions = 0;

  for (const event of events) {
    // 格式偏好
    const pathKey = `${event.input_ext}->${event.searched_format}`;
    formatCounts[pathKey] = (formatCounts[pathKey] || 0) + 1;

    // 引擎偏好
    if (!engineCounts[event.searched_format]) {
      engineCounts[event.searched_format] = {};
    }
    const formatEngines = engineCounts[event.searched_format];
    if (formatEngines) {
      formatEngines[event.selected_engine] = (formatEngines[event.selected_engine] || 0) + 1;
    }

    // 最近格式 (去重)
    if (!recentFormats.includes(event.searched_format)) {
      recentFormats.push(event.searched_format);
    }

    totalConversions++;
  }

  // 正規化為 0-1 範圍
  const maxFormatCount = Math.max(...Object.values(formatCounts), 1);
  const formatPreferences: Record<string, number> = {};
  for (const [key, count] of Object.entries(formatCounts)) {
    formatPreferences[key] = count / maxFormatCount;
  }

  const enginePreferences: Record<string, Record<string, number>> = {};
  for (const [format, engines] of Object.entries(engineCounts)) {
    const maxCount = Math.max(...Object.values(engines), 1);
    enginePreferences[format] = {};
    for (const [engine, count] of Object.entries(engines)) {
      enginePreferences[format][engine] = count / maxCount;
    }
  }

  const profile: UserProfile = {
    user_id: userId,
    format_preferences: formatPreferences,
    engine_preferences: enginePreferences,
    recent_formats: recentFormats.slice(0, 10),
    total_conversions: totalConversions,
    last_updated: new Date().toISOString(),
  };

  // 儲存到資料庫
  db.query(
    `
    INSERT OR REPLACE INTO user_profiles 
    (user_id, format_preferences, engine_preferences, recent_formats, total_conversions, last_updated)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
  ).run(
    profile.user_id,
    JSON.stringify(profile.format_preferences),
    JSON.stringify(profile.engine_preferences),
    JSON.stringify(profile.recent_formats),
    profile.total_conversions,
    profile.last_updated,
  );

  return profile;
}

/**
 * 取得使用者 Profile
 */
export function getUserProfile(userId: number): UserProfile | null {
  interface ProfileRow {
    user_id: number;
    format_preferences: string;
    engine_preferences: string;
    recent_formats: string;
    total_conversions: number;
    last_updated: string;
  }

  const row = db
    .query(
      `
    SELECT * FROM user_profiles WHERE user_id = ?
  `,
    )
    .get(userId) as ProfileRow | null;

  if (!row) {
    return null;
  }

  return {
    user_id: row.user_id,
    format_preferences: JSON.parse(row.format_preferences),
    engine_preferences: JSON.parse(row.engine_preferences),
    recent_formats: JSON.parse(row.recent_formats),
    total_conversions: row.total_conversions,
    last_updated: row.last_updated,
  };
}

// ==================== 全域統計 ====================

/**
 * 計算全域格式轉換統計
 */
export function calculateGlobalStats(): FormatConversionStats {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  interface StatsRow {
    searched_format: string;
    count: number;
  }

  interface PathRow {
    input_ext: string;
    searched_format: string;
    count: number;
  }

  interface EngineRow {
    selected_engine: string;
    total: number;
    success_count: number;
  }

  // 格式流行度
  const formatStats = db
    .query(
      `
    SELECT searched_format, COUNT(*) as count
    FROM conversion_events
    WHERE timestamp > ?
    GROUP BY searched_format
    ORDER BY count DESC
  `,
    )
    .all(sevenDaysAgo) as StatsRow[];

  const maxCount = formatStats[0]?.count ?? 1;
  const formatPopularity: Record<string, number> = {};
  for (const row of formatStats) {
    formatPopularity[row.searched_format] = row.count / maxCount;
  }

  // 轉換路徑
  const pathStats = db
    .query(
      `
    SELECT input_ext, searched_format, COUNT(*) as count
    FROM conversion_events
    WHERE timestamp > ?
    GROUP BY input_ext, searched_format
  `,
    )
    .all(sevenDaysAgo) as PathRow[];

  const conversionPaths: Record<string, number> = {};
  for (const row of pathStats) {
    conversionPaths[`${row.input_ext}->${row.searched_format}`] = row.count;
  }

  // 引擎成功率
  const engineStats = db
    .query(
      `
    SELECT selected_engine, COUNT(*) as total, SUM(success) as success_count
    FROM conversion_events
    WHERE timestamp > ?
    GROUP BY selected_engine
  `,
    )
    .all(sevenDaysAgo) as EngineRow[];

  const engineSuccessRates: Record<string, number> = {};
  for (const row of engineStats) {
    engineSuccessRates[row.selected_engine] = row.success_count / row.total;
  }

  return {
    format_popularity: formatPopularity,
    conversion_paths: conversionPaths,
    engine_success_rates: engineSuccessRates,
    stats_period: {
      start: sevenDaysAgo,
      end: new Date().toISOString(),
    },
  };
}

// ==================== 資料清理 ====================

/**
 * 清理過期的行為資料
 */
export function cleanupOldEvents(daysToKeep = 90): number {
  const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString();

  interface DeleteResult {
    changes: number;
  }

  const result1 = db
    .query(
      `
    DELETE FROM conversion_events WHERE timestamp < ?
  `,
    )
    .run(cutoff) as unknown as DeleteResult;

  const result2 = db
    .query(
      `
    DELETE FROM dismiss_events WHERE timestamp < ?
  `,
    )
    .run(cutoff) as unknown as DeleteResult;

  const deletedCount = (result1.changes ?? 0) + (result2.changes ?? 0);
  console.log(`🧹 Cleaned up ${deletedCount} old behavior events`);

  return deletedCount;
}

// 導出初始化函數
export default {
  initBehaviorTables,
  logConversionEvent,
  logDismissEvent,
  getUserProfile,
  rebuildUserProfile,
  calculateGlobalStats,
  cleanupOldEvents,
};
