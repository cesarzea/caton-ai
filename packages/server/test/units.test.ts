import {mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

import {describe, expect, it} from 'vitest';

import {loadAssets} from '../src/index.ts';
import {createSessions} from '../src/sessions.ts';
import {createThrottle} from '../src/throttle.ts';
import {call, started, temporaryDirectory} from './harness.ts';

describe('sessions', () => {
  it('expire, and only the latest link works', () => {
    let now = 0;
    const sessions = createSessions(() => now);
    const stale = sessions.issueToken();
    const fresh = sessions.issueToken();

    expect(sessions.exchange(stale)).toBeNull();
    const id = sessions.exchange(fresh) ?? '';
    expect(sessions.isValid(`other=1; caton_session=${id}`)).toBe(true);
    now += 13 * 60 * 60_000;
    expect(sessions.isValid(`caton_session=${id}`)).toBe(false);
    const late = sessions.issueToken();
    now += 11 * 60_000;
    expect(sessions.exchange(late)).toBeNull();
  });
});

describe('throttle', () => {
  it('doubles the wait after each failure, up to a minute, and resets on success', () => {
    let now = 0;
    const throttle = createThrottle(() => now);
    const waits = [1, 2, 3, 4, 5, 6, 7, 8].map(() => (throttle.failed(), throttle.wait()));

    expect(waits).toEqual([1_000, 2_000, 4_000, 8_000, 16_000, 32_000, 60_000, 60_000]);
    now += 60_000;
    expect(throttle.wait()).toBe(0);
    throttle.succeeded();
    throttle.failed();
    expect(throttle.wait()).toBe(1_000);
  });
});

describe('assets', () => {
  it('serves only the built files, with the application shell for unknown paths', async () => {
    const directory = temporaryDirectory();
    mkdirSync(join(directory, 'assets'));
    writeFileSync(join(directory, 'index.html'), '<html>shell</html>');
    writeFileSync(join(directory, 'assets', 'app-1.js'), 'console.log(1)');
    writeFileSync(join(directory, 'notes.txt'), 'not served');
    const {port} = await started({assets: loadAssets(directory)});

    const script = await call(port, {path: '/assets/app-1.js'});
    expect([script.status, script.headers['content-type'], script.body]).toEqual([
      200,
      'text/javascript; charset=utf-8',
      'console.log(1)',
    ]);
    expect((await call(port, {path: '/notes.txt'})).body).toBe('<html>shell</html>');
    expect((await call(port, {path: '/../../etc/passwd'})).body).toBe('<html>shell</html>');
    expect((await call(port, {method: 'POST', path: '/index.html', body: {}})).status).toBe(405);
    expect(loadAssets(join(directory, 'assets'))).toBeNull();
  });

  it('shows how to build the interface when it has not been built', async () => {
    const {port} = await started();

    expect((await call(port, {path: '/secrets'})).body).toContain('npm run build -w @caton-ai/web');
  });
});
