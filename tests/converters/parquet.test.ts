import { expect, test, describe, mock } from "bun:test";
import { Writable } from "node:stream";

const mockParquetMetadataAsync = mock(async () => {
  return {
    row_groups: [{ num_rows: 1 }],
  };
});

const mockParquetRead = mock(
  async (options: {
    file: unknown;
    rowStart: number;
    rowEnd: number;
    rowFormat: string;
    onComplete: (rows: { col1: string }[]) => void;
  }) => {
    if (options.onComplete) {
      options.onComplete([{ col1: "value" }]);
    }
    return [];
  },
);

const mockCreateWriteStream = mock(() => {
  return new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });
});

const mockFileHandle = {
  stat: mock(async () => ({ size: 100 })),
  read: mock(async (buf: Buffer) => {
    return { bytesRead: buf.length, buffer: buf };
  }),
  close: mock(async () => {}),
};

mock.module("node:fs/promises", () => ({
  open: mock(async () => mockFileHandle),
}));

mock.module("hyparquet", () => {
  return {
    parquetMetadataAsync: mockParquetMetadataAsync,
    parquetRead: mockParquetRead,
  };
});

mock.module("node:fs", () => {
  return {
    createWriteStream: mockCreateWriteStream,
  };
});

import { convert } from "../../src/converters/parquet";

describe("parquet converter", () => {
  test("convert resolves when process succeeds", async () => {
    const result = await convert("input.parquet", "parquet", "csv", "output.csv");
    expect(result).toBe("Done");
  });

  test("convert rejects when parquetRead fails", async () => {
    mockParquetRead.mockRejectedValueOnce(new Error("Read error"));

    await expect(convert("invalid.parquet", "parquet", "csv", "output.csv")).rejects.toThrow(
      "Read error",
    );
  });

  test("convert rejects when metadata fails", async () => {
    mockParquetMetadataAsync.mockRejectedValueOnce(new Error("Metadata error"));

    await expect(convert("invalid.parquet", "parquet", "csv", "output.csv")).rejects.toThrow(
      "Metadata error",
    );
  });
});
