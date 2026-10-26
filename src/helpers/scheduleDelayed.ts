/** SetTimeout delays above this overflow a signed 32-bit integer and fire immediately. */
const MAX_TIMEOUT_DELAY_MS = 2 ** 31 - 1;

type ArmTimer = (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;

const armNativeTimer: ArmTimer = (callback, delayMs) => setTimeout(callback, delayMs);

export type ScheduledTask = {
  /** Stops the task. Works across chunk boundaries, unlike a raw timer handle. */
  cancel: () => void;
};

export function scheduleDelayed(
  delayMs: number,
  task: () => void,
  armTimer: ArmTimer = armNativeTimer,
): ScheduledTask {
  let handle: ReturnType<typeof setTimeout> | undefined;
  let cancelled = false;

  const arm = (remainingMs: number) => {
    const chunkMs = Math.min(remainingMs, MAX_TIMEOUT_DELAY_MS);
    handle = armTimer(() => {
      if (cancelled) {
        return;
      }

      const restMs = remainingMs - chunkMs;
      if (restMs > 0) {
        arm(restMs);
        return;
      }

      task();
    }, chunkMs);
  };

  arm(delayMs);

  return {
    cancel: () => {
      cancelled = true;
      if (handle !== undefined) {
        clearTimeout(handle);
      }
    },
  };
}
