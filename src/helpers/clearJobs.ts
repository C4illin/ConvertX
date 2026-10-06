import type { Database } from "bun:sqlite";
import { Jobs } from "../db/types";
import { rmBounded } from "./rmBounded";

export function clearExpiredJobs(options: {
  db: Database;
  outputDir: string;
  uploadsDir: string;
  olderThan: Date;
  rm?: (path: string) => void;
}): void {
  const rm = options.rm ?? ((path: string) => rmBounded(path));
  const jobs = options.db
    .query("SELECT * FROM jobs WHERE date_created < ?")
    .as(Jobs)
    .all(options.olderThan.toISOString());

  for (const job of jobs) {
    try {
      rm(`${options.outputDir}${job.user_id}/${job.id}`);
      rm(`${options.uploadsDir}${job.user_id}/${job.id}`);
      options.db.query("DELETE FROM jobs WHERE id = ?").run(job.id);
    } catch (error) {
      console.error(`Failed to delete expired job ${job.id}:`, error);
    }
  }
}

export function startJobCleanup(options: {
  db: Database;
  outputDir: string;
  uploadsDir: string;
  intervalHours: number;
  rm?: (path: string) => void;
  schedule?: (callback: () => void, delay: number) => unknown;
}): void {
  const schedule = options.schedule ?? setTimeout;
  const delay = options.intervalHours * 60 * 60 * 1000;

  const tick = () => {
    try {
      clearExpiredJobs({
        db: options.db,
        outputDir: options.outputDir,
        uploadsDir: options.uploadsDir,
        olderThan: new Date(Date.now() - delay),
        ...(options.rm !== undefined ? { rm: options.rm } : {}),
      });
    } catch (error) {
      console.error("Failed to clear expired jobs:", error);
    } finally {
      schedule(tick, delay);
    }
  };

  tick();
}
