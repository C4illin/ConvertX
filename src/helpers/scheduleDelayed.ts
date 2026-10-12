/** setTimeout delays above this overflow a signed 32-bit integer and fire immediately. */
const MAX_TIMEOUT_DELAY_MS = 2 ** 31 - 1;

type ArmTimer = (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;

const armNativeTimer: ArmTimer = (callback, delayMs) => setTimeout(callback, delayMs);

export function scheduleDelayed(
  delayMs: number,
  task: () => void,
  armTimer: ArmTimer = armNativeTimer,
): ReturnType<typeof setTimeout> {
  const chunkMs = Math.min(delayMs, MAX_TIMEOUT_DELAY_MS);

  return armTimer(() => {
    const remainingMs = delayMs - chunkMs;
    if (remainingMs > 0) {
      scheduleDelayed(remainingMs, task, armTimer);
      return;
    }

    task();
  }, chunkMs);
}
