import {existsSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

import {describe, expect, it} from 'vitest';

import {withLock} from '../src/lock.ts';
import {temporaryDirectory} from './fixtures.ts';

describe('withLock', () => {
  it('takes over a lock left by a process that no longer runs, and releases it', async () => {
    const path = join(temporaryDirectory(), 'secrets.lock');
    writeFileSync(path, '999999999');

    expect(await withLock(path, () => Promise.resolve('done'))).toBe('done');
    expect(existsSync(path)).toBe(false);
  });

  it('waits for a live owner and gives up with a clear message', async () => {
    const path = join(temporaryDirectory(), 'secrets.lock');
    writeFileSync(path, String(process.pid));

    await expect(withLock(path, () => Promise.resolve())).rejects.toThrow(/secret store is busy/u);
  }, 10_000);
});
