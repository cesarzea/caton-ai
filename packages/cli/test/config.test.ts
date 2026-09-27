import {chmodSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {homedir, tmpdir} from 'node:os';
import {join} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {ConfigError, loadConfig, readPrivateKey} from '../src/config.ts';
import {configDirectory, dataDirectory, expandHome} from '../src/paths.ts';

const directories: string[] = [];

function directoryWith(files: Readonly<Record<string, [string, number]>>): string {
  const directory = mkdtempSync(join(tmpdir(), 'caton-config-'));
  directories.push(directory);
  Object.entries(files).forEach(([name, [content, mode]]) => {
    writeFileSync(join(directory, name), content);
    chmodSync(join(directory, name), mode);
  });
  return directory;
}

const valid = (keyPath: string): string =>
  JSON.stringify({
    enableBanking: {appId: 'app', privateKeyPath: keyPath},
    connections: [{name: 'millennium', sessionId: 's'}],
  });

afterEach(() => {
  directories.splice(0).forEach(directory => {
    rmSync(directory, {recursive: true, force: true});
  });
});

describe('loadConfig', () => {
  it('loads a private, valid configuration and its private key', () => {
    const directory = directoryWith({'key.pem': ['KEY', 0o600]});
    writeFileSync(join(directory, 'config.json'), valid(join(directory, 'key.pem')), {mode: 0o600});

    expect(readPrivateKey(loadConfig(directory))).toBe('KEY');
  });

  it('refuses files that other users can read', () => {
    const directory = directoryWith({'config.json': [valid('/k'), 0o644]});

    expect(() => loadConfig(directory)).toThrow(ConfigError);
  });

  it('explains what is wrong with an invalid configuration', () => {
    const directory = directoryWith({'config.json': ['{"connections": []}', 0o600]});

    expect(() => loadConfig(directory)).toThrow(/is invalid/u);
  });
});

describe('paths', () => {
  it('expands the home directory and honours environment overrides', () => {
    expect(expandHome('~/key.pem')).toBe(join(homedir(), 'key.pem'));
    expect(expandHome('/abs/key.pem')).toBe('/abs/key.pem');
    expect(configDirectory({CATON_CONFIG_DIR: '/config'})).toBe('/config');
    expect(dataDirectory({CATON_DATA_DIR: '/data'})).toBe('/data');
    expect(dataDirectory({})).toBe(join(homedir(), '.local', 'share', 'caton-ai'));
  });
});
