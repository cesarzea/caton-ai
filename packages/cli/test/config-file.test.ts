import {mkdtempSync, readFileSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {describe, expect, it} from 'vitest';

import {configFile} from '../src/config-file.ts';

describe('configFile', () => {
  it('replaces the file for its owner only, keeping a backup of the previous one', () => {
    const directory = mkdtempSync(join(tmpdir(), 'caton-config-file-'));
    try {
      writeFileSync(join(directory, 'config.json'), '{"old":true}', {mode: 0o600});
      const file = configFile(directory, () => new Date('2026-09-27T10:00:00.000Z'));

      expect(file.read()).toEqual({old: true});
      const backup = file.replace({instances: []});

      expect(backup).toBe(join(directory, 'config.json.bak-2026-09-27T10-00-00-000Z'));
      expect(readFileSync(backup, 'utf8')).toBe('{"old":true}');
      expect(file.read()).toEqual({instances: []});
      expect(statSync(join(directory, 'config.json')).mode & 0o777).toBe(0o600);
    } finally {
      rmSync(directory, {recursive: true, force: true});
    }
  });
});
