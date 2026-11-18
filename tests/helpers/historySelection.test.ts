import { describe, expect, test } from "bun:test";

import {
  arrowPath,
  deleteConfirmMessage,
  deleteResultMessage,
  selectionState,
} from "../../src/helpers/historySelection";

describe("selectionState", () => {
  test.each([
    [[], { count: 0, all: false, some: false }],
    [[false, false], { count: 0, all: false, some: false }],
    [[true, false], { count: 1, all: false, some: true }],
    [[true, true], { count: 2, all: true, some: false }],
  ])("%j", (checked, expected) => {
    expect(selectionState(checked)).toEqual(expected);
  });
});

describe("arrowPath", () => {
  test("points right when collapsed and down when expanded", () => {
    expect(arrowPath(true)).toContain("M8.25 4.5");
    expect(arrowPath(false)).toContain("M19.5 8.25");
  });
});

test("deleteConfirmMessage", () => {
  expect(deleteConfirmMessage(3)).toBe(
    "Are you sure you want to delete 3 job(s)? This action cannot be undone.",
  );
});

describe("deleteResultMessage", () => {
  test("reports deletions", () => {
    expect(deleteResultMessage({ success: true, deleted: 2, failed: 0 })).toEqual({
      message: "Successfully deleted 2 job(s).",
      reload: true,
    });
  });

  test("reports partial failures", () => {
    expect(deleteResultMessage({ success: false, deleted: 1, failed: 2 })).toEqual({
      message: "Successfully deleted 1 job(s). Failed to delete 2 job(s).",
      reload: true,
    });
  });

  test("reports total failure", () => {
    expect(deleteResultMessage({ success: false, deleted: 0, failed: 2 })).toEqual({
      message: "Failed to delete jobs. Please try again.",
      reload: false,
    });
  });
});
