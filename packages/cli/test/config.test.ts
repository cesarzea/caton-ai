import {chmodSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {homedir, tmpdir} from 'node:os';
import {join} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {ConfigError, loadConfig} from '../src/config.ts';
import {configDirectory, dataDirectory, expandHome} from '../src/paths.ts';
import {secretReader} from '../src/secrets.ts';

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

const valid = JSON.stringify({
  plugins: {'enable-banking': {appId: 'app', privateKey: 'file:~/key.pem'}},
  connections: [{name: 'millennium', type: 'enable-banking', sessionId: 's'}],
});

afterEach(() => {
  directories.splice(0).forEach(directory => {
    rmSync(directory, {recursive: true, force: true});
  });
});

describe('loadConfig', () => {
  it('loads a private, valid configuration, keeping each connection’s own settings', () => {
    const config = loadConfig(directoryWith({'config.json': [valid, 0o600]}));

    expect(config.connections).toEqual([
      {name: 'millennium', type: 'enable-banking', sessionId: 's'},
    ]);
    expect(config.plugins['enable-banking']).toEqual({appId: 'app', privateKey: 'file:~/key.pem'});
  });

  it('refuses files that other users can read', () => {
    const directory = directoryWith({'config.json': [valid, 0o644]});

    expect(() => loadConfig(directory)).toThrow(ConfigError);
  });

  it('explains what is wrong with an invalid configuration', () => {
    const twice = {name: 'a', type: 'enable-banking'};
    const cases = ['{"connections": []}', JSON.stringify({connections: [twice, twice]})];
    for (const content of cases) {
      const directory = directoryWith({'config.json': [content, 0o600]});
      expect(() => loadConfig(directory)).toThrow(/is invalid/u);
    }
  });
});

const readSecret = secretReader((service, account) => `${service}|${account}`);

describe('secret references', () => {
  it('read private files and refuse shared files and unknown schemes', () => {
    const directory = directoryWith({'key.pem': ['KEY', 0o600], 'shared.pem': ['KEY', 0o644]});

    expect(readSecret(`file:${join(directory, 'key.pem')}`)).toBe('KEY');
    expect(() => readSecret(`file:${join(directory, 'shared.pem')}`)).toThrow(ConfigError);
    expect(() => readSecret('vault:key')).toThrow(/Unsupported secret reference/u);
  });

  it('read the credential store by service and account', () => {
    expect(readSecret('keychain:caton-ai/user@example.com')).toBe('caton-ai|user@example.com');
    for (const malformed of ['keychain:caton-ai', 'keychain:/user', 'keychain:caton-ai/']) {
      expect(() => readSecret(malformed)).toThrow(/keychain:<service>\/<account>/u);
    }
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
