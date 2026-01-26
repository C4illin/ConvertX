/**
 * 引擎預調用 (Warm-up) 模組
 *
 * 在預測信心度足夠高時，提前預調用引擎以降低轉檔延遲
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * 預調用狀態
 */
export interface WarmupStatus {
  /** 引擎名稱 */
  engine: string;
  /** 狀態 */
  status: "pending" | "warming" | "ready" | "failed" | "cancelled";
  /** 開始時間 */
  started_at?: string;
  /** 完成時間 */
  completed_at?: string;
  /** 錯誤訊息 */
  error?: string;
}

/**
 * 引擎預調用命令配置
 */
interface WarmupCommand {
  /** 執行檔 */
  command: string;
  /** 參數 */
  args: string[];
  /** 超時時間 (毫秒) */
  timeout: number;
}

/**
 * 各引擎的預調用命令
 */
const ENGINE_WARMUP_COMMANDS: Record<string, WarmupCommand> = {
  imagemagick: {
    command: "magick",
    args: ["-version"],
    timeout: 5000,
  },
  graphicsmagick: {
    command: "gm",
    args: ["version"],
    timeout: 5000,
  },
  vips: {
    command: "vips",
    args: ["--version"],
    timeout: 3000,
  },
  ffmpeg: {
    command: "ffmpeg",
    args: ["-version"],
    timeout: 5000,
  },
  libreoffice: {
    command: "soffice",
    args: ["--version"],
    timeout: 10000,
  },
  inkscape: {
    command: "inkscape",
    args: ["--version"],
    timeout: 8000,
  },
  pandoc: {
    command: "pandoc",
    args: ["--version"],
    timeout: 5000,
  },
  calibre: {
    command: "ebook-convert",
    args: ["--version"],
    timeout: 8000,
  },
  resvg: {
    command: "resvg",
    args: ["--help"],
    timeout: 3000,
  },
  libheif: {
    command: "heif-info",
    args: ["--version"],
    timeout: 3000,
  },
  libjxl: {
    command: "djxl",
    args: ["--version"],
    timeout: 3000,
  },
  assimp: {
    command: "assimp",
    args: ["version"],
    timeout: 5000,
  },
  dasel: {
    command: "dasel",
    args: ["--version"],
    timeout: 2000,
  },
};

/**
 * 引擎預調用管理器
 */
export class EngineWarmupManager {
  /** 當前預調用狀態 */
  private currentWarmup: WarmupStatus | null = null;

  /** 預調用 Promise */
  private warmupPromise: Promise<void> | null = null;

  /** 取消標記 */
  private cancelRequested = false;

  /**
   * 開始預調用引擎
   * 注意：同時只會有一個引擎被預調用
   */
  async warmup(engine: string): Promise<boolean> {
    // 如果已經在預調用同一個引擎，直接返回
    if (this.currentWarmup?.engine === engine && this.currentWarmup.status === "warming") {
      return true;
    }

    // 取消之前的預調用
    if (this.currentWarmup?.status === "warming") {
      this.cancel();
    }

    // 檢查是否有該引擎的預調用命令
    const warmupCmd = ENGINE_WARMUP_COMMANDS[engine];
    if (!warmupCmd) {
      console.warn(`No warmup command defined for engine: ${engine}`);
      return false;
    }

    // 設定狀態
    this.cancelRequested = false;
    this.currentWarmup = {
      engine,
      status: "warming",
      started_at: new Date().toISOString(),
    };

    console.log(`🔥 Warming up engine: ${engine}`);

    // 執行預調用
    this.warmupPromise = this.executeWarmup(engine, warmupCmd);

    try {
      await this.warmupPromise;
      return this.currentWarmup?.status === "ready";
    } catch {
      return false;
    }
  }

  /**
   * 執行預調用命令
   */
  private async executeWarmup(engine: string, cmd: WarmupCommand): Promise<void> {
    try {
      // 檢查是否已取消
      if (this.cancelRequested) {
        this.updateStatus("cancelled");
        return;
      }

      await execFileAsync(cmd.command, cmd.args, {
        timeout: cmd.timeout,
      });

      // 再次檢查是否已取消
      if (this.cancelRequested) {
        this.updateStatus("cancelled");
        return;
      }

      this.updateStatus("ready");
      console.log(`✅ Engine ${engine} warmed up successfully`);
    } catch (error) {
      if (this.cancelRequested) {
        this.updateStatus("cancelled");
        return;
      }

      this.updateStatus("failed", error instanceof Error ? error.message : "Unknown error");
      console.warn(`⚠️ Failed to warm up engine ${engine}:`, error);
    }
  }

  /**
   * 更新預調用狀態
   */
  private updateStatus(status: WarmupStatus["status"], error?: string): void {
    if (this.currentWarmup) {
      this.currentWarmup.status = status;
      if (status === "ready" || status === "failed" || status === "cancelled") {
        this.currentWarmup.completed_at = new Date().toISOString();
      }
      if (error) {
        this.currentWarmup.error = error;
      }
    }
  }

  /**
   * 取消當前預調用
   */
  cancel(): void {
    if (this.currentWarmup?.status === "warming") {
      console.log(`❌ Cancelling warmup for engine: ${this.currentWarmup.engine}`);
      this.cancelRequested = true;
      this.updateStatus("cancelled");
    }
  }

  /**
   * 取得當前預調用狀態
   */
  getStatus(): WarmupStatus | null {
    return this.currentWarmup;
  }

  /**
   * 檢查引擎是否已預調用完成
   */
  isReady(engine: string): boolean {
    return this.currentWarmup?.engine === engine && this.currentWarmup.status === "ready";
  }

  /**
   * 重置狀態
   */
  reset(): void {
    this.cancel();
    this.currentWarmup = null;
    this.warmupPromise = null;
    this.cancelRequested = false;
  }
}

// 導出單例
export const engineWarmupManager = new EngineWarmupManager();
