import {readFileSync, rmSync, writeFileSync} from 'node:fs';

import {SecretsError} from './errors.ts';

const WAIT_MS = 5_000;
const RETRY_MS = 50;

const pause = (milliseconds: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, milliseconds));

/** A lock whose owner process no longer runs, or that holds no process id, can be taken. */
function isStale(path: string): boolean {
  let pid: number;
  try {
    pid = Number(readFileSync(path, 'utf8'));
  } catch {
    return false;
  }
  if (!Number.isSafeInteger(pid) || pid <= 0) {
    return true;
  }
  try {
    process.kill(pid, 0);
    return false;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'ESRCH';
  }
}

function tryAcquire(path: string): boolean {
  try {
    writeFileSync(path, String(process.pid), {flag: 'wx', mode: 0o600});
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
    if (isStale(path)) {
      rmSync(path, {force: true});
    }
    return false;
  }
}

/**
 * Runs `work` holding an exclusive lock file, so that processes sharing the store (the web
 * server and the command line) never overwrite each other's changes.
 */
export async function withLock<T>(path: string, work: () => Promise<T>): Promise<T> {
  const deadline = Date.now() + WAIT_MS;
  while (!tryAcquire(path)) {
    if (Date.now() > deadline) {
      throw new SecretsError('The secret store is busy: another Catón AI process is writing it');
    }
    await pause(RETRY_MS);
  }
  try {
    return await work();
  } finally {
    rmSync(path, {force: true});
  }
}
