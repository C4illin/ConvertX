import * as fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { stringify } from "csv-stringify";
import { parquetMetadataAsync, parquetRead } from "hyparquet";
import { compressors } from "hyparquet-compressors";

export const properties = {
  from: {
    data: ["parquet"],
  },
  to: {
    data: ["csv"],
  },
};

export async function convert(
  filePath: string,
  fileType: string,
  convertTo: string,
  targetPath: string,
  options?: unknown, // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<string> {
  const fileHandle = await fs.open(filePath, "r");
  try {
    const stat = await fileHandle.stat();
    const file = {
      byteLength: stat.size,
      async slice(start: number, end?: number): Promise<ArrayBuffer> {
        const length = (end ?? stat.size) - start;
        const buf = Buffer.allocUnsafe(length);
        const { bytesRead } = await fileHandle.read(buf, 0, length, start);
        return buf.buffer.slice(buf.byteOffset, buf.byteOffset + bytesRead);
      },
    };

    const metadata = await parquetMetadataAsync(file, { compressors } as never);
    const stringifier = stringify({
      header: true,
      cast: {
        object: (value: unknown) =>
          JSON.stringify(value, (_key: string, val: unknown) =>
            typeof val === "bigint" ? Number(val) : val,
          ),
      },
    });
    const writeStream = createWriteStream(targetPath);

    return new Promise((resolve, reject) => {
      stringifier.pipe(writeStream);

      let settled = false;
      const settle = (err?: unknown) => {
        if (settled) return;
        settled = true;
        fileHandle.close().catch(() => {});
        if (err) reject(err);
        else resolve("Done");
      };

      writeStream.on("finish", settle);
      writeStream.on("error", settle);
      stringifier.on("error", settle);

      const writeRow = async (rawRow: Record<string, unknown>) => {
        const row: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(rawRow)) {
          row[key] = typeof value === "bigint" ? Number(value) : value;
        }
        if (stringifier.write(row)) return;
        await new Promise<void>((resolve) => {
          stringifier.once("drain", resolve);
        });
      };

      const writePromises: Promise<void>[] = [];

      (async () => {
        try {
          let rowStart = 0;
          for (const rowGroup of metadata.row_groups) {
            const numRows = Number(rowGroup.num_rows);
            const rowEnd = rowStart + numRows;

            await parquetRead({
              file,
              rowStart,
              rowEnd,
              rowFormat: "object",
              compressors,
              onComplete: (rows) => {
                if (Array.isArray(rows)) {
                  writePromises.push(
                    (async () => {
                      for (const row of rows) {
                        await writeRow(row);
                      }
                    })(),
                  );
                }
              },
            });
            rowStart = rowEnd;
          }

          await Promise.all(writePromises);
          stringifier.end();
        } catch (err) {
          settle(err);
          writeStream.destroy(err as Error);
          stringifier.destroy(err as Error);
        }
      })();
    });
  } catch (err) {
    await fileHandle.close();
    throw err;
  }
}
