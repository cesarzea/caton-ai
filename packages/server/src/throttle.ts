const MAX_DELAY_MS = 60_000;

/** Slows down guessing: after each failure, the next attempt must wait twice as long. */
export interface Throttle {
  /** Milliseconds to wait before the next attempt is allowed; 0 when it is. */
  wait(): number;
  failed(): void;
  succeeded(): void;
}

export function createThrottle(now: () => number = Date.now): Throttle {
  let failures = 0;
  let allowedAt = 0;
  return {
    wait: () => Math.max(0, allowedAt - now()),
    failed: () => {
      failures += 1;
      allowedAt = now() + Math.min(MAX_DELAY_MS, 1_000 * 2 ** (failures - 1));
    },
    succeeded: () => {
      failures = 0;
      allowedAt = 0;
    },
  };
}
