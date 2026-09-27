import {describe, expect, it} from 'vitest';

import {firstDayOfLastMonths} from '../src/index.ts';

describe('firstDayOfLastMonths', () => {
  it('starts the period on the first day of the oldest month, the current one included', () => {
    const now = new Date('2026-09-27T10:00:00Z');

    expect(firstDayOfLastMonths(now, 1)).toBe('2026-09-01');
    expect(firstDayOfLastMonths(now, 3)).toBe('2026-07-01');
    expect(firstDayOfLastMonths(now, 12)).toBe('2025-10-01');
  });
});
