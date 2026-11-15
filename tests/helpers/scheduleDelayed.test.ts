import { expect, test } from "bun:test";

import { scheduleDelayed } from "../../src/helpers/scheduleDelayed";

/** Largest delay setTimeout accepts before a 32-bit overflow. */
const MAX_TIMEOUT_DELAY_MS = 2 ** 31 - 1;
/** Delay reported in the TimeoutOverflowWarning: 30 days in milliseconds. */
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

type ArmedTimer = {
  delayMs: number;
  fire: () => void;
};

function captureTimers(): {
  armed: ArmedTimer[];
  armTimer: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
} {
  const armed: ArmedTimer[] = [];
  const armTimer = (callback: () => void, delayMs: number) => {
    armed.push({ delayMs, fire: callback });
    return 0 as unknown as ReturnType<typeof setTimeout>;
  };
  return { armed, armTimer };
}

test("runs a one day delay as a single timer", () => {
  const { armed, armTimer } = captureTimers();
  let runs = 0;
  const oneDayMs = 24 * 60 * 60 * 1000;

  scheduleDelayed(
    oneDayMs,
    () => {
      runs += 1;
    },
    armTimer,
  );

  expect(armed).toHaveLength(1);
  const timer = armed.shift();
  expect(timer?.delayMs).toBe(oneDayMs);
  expect(runs).toBe(0);

  timer?.fire();
  expect(runs).toBe(1);
  expect(armed).toHaveLength(0);
});

test("runs a 30 day delay in timer-sized chunks that add up to 30 days", () => {
  expect(THIRTY_DAYS_MS).toBe(2_592_000_000);

  const { armed, armTimer } = captureTimers();
  let runs = 0;
  scheduleDelayed(
    THIRTY_DAYS_MS,
    () => {
      runs += 1;
    },
    armTimer,
  );

  let elapsedMs = 0;
  let chunks = 0;
  while (runs === 0) {
    chunks += 1;
    expect(chunks).toBeLessThanOrEqual(3);

    const next = armed.shift();
    if (!next) {
      throw new Error("timer chain ended before the task ran");
    }

    expect(next.delayMs).toBeGreaterThan(0);
    expect(next.delayMs).toBeLessThanOrEqual(MAX_TIMEOUT_DELAY_MS);
    elapsedMs += next.delayMs;
    next.fire();
  }

  expect(runs).toBe(1);
  expect(elapsedMs).toBe(THIRTY_DAYS_MS);
  expect(armed).toHaveLength(0);
});

test("cancelling before the first chunk fires prevents the task", () => {
  const { armed, armTimer } = captureTimers();
  let runs = 0;
  const scheduled = scheduleDelayed(
    THIRTY_DAYS_MS,
    () => {
      runs += 1;
    },
    armTimer,
  );

  scheduled.cancel();
  armed.shift()?.fire();
  expect(runs).toBe(0);
  expect(armed).toHaveLength(0);
});

test("cancelling after a chunk fired still stops the remaining chain", () => {
  const { armed, armTimer } = captureTimers();
  let runs = 0;
  const scheduled = scheduleDelayed(
    THIRTY_DAYS_MS,
    () => {
      runs += 1;
    },
    armTimer,
  );

  armed.shift()?.fire();
  expect(armed).toHaveLength(1);
  expect(runs).toBe(0);

  scheduled.cancel();
  armed.shift()?.fire();
  expect(runs).toBe(0);
  expect(armed).toHaveLength(0);
});

test("does not emit a timeout overflow warning for a 30 day delay", async () => {
  const warnings: string[] = [];
  const onWarning = (warning: Error) => {
    warnings.push(warning.message);
  };
  process.on("warning", onWarning);

  let ran = false;
  const scheduled = scheduleDelayed(THIRTY_DAYS_MS, () => {
    ran = true;
  });

  try {
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(ran).toBe(false);
    expect(warnings.join("\n")).not.toContain("TimeoutOverflowWarning");
    expect(warnings.join("\n")).not.toContain("2592000000");
  } finally {
    scheduled.cancel();
    process.off("warning", onWarning);
  }
});
