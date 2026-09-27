import {describe, expect, it} from 'vitest';

import {SecretsError, osCredentialStore} from '../src/index.ts';
import type {Runner} from '../src/index.ts';

const KEY = 'AGE-SECRET-KEY-1QQQQ';

function recordingRunner(output = ''): {readonly run: Runner; readonly calls: unknown[][]} {
  const calls: unknown[][] = [];
  return {
    calls,
    run: (file, args, input) => {
      calls.push([file, args, input]);
      return output;
    },
  };
}

describe('macOS Keychain', () => {
  it('writes through stdin, so the key never appears in process arguments', () => {
    const {run, calls} = recordingRunner();
    osCredentialStore('darwin', run).write('caton-ai', 'secret-store-key', KEY);

    expect(calls).toEqual([
      [
        '/usr/bin/security',
        ['-i'],
        `add-generic-password -s caton-ai -a secret-store-key -U -w ${KEY}\n`,
      ],
    ]);
    expect(JSON.stringify(calls.map(([file, args]) => [file, args]))).not.toContain(KEY);
  });

  it('reads by absolute path and refuses values that could break the command', () => {
    const {run, calls} = recordingRunner(`${KEY}\n`);
    const store = osCredentialStore('darwin', run);

    expect(store.read('caton-ai', 'secret-store-key')).toBe(KEY);
    expect(calls[0]?.[0]).toBe('/usr/bin/security');
    expect(() => {
      store.write('caton-ai', 'key', 'x\nremove-keychain');
    }).toThrow(SecretsError);
  });
});

describe('other credential stores', () => {
  it('use Secret Service on Linux, with the key on stdin', () => {
    const {run, calls} = recordingRunner(KEY);
    const store = osCredentialStore('linux', run);
    store.write('caton-ai', 'secret-store-key', KEY);

    expect(store.read('caton-ai', 'secret-store-key')).toBe(KEY);
    expect(calls[0]).toEqual([
      '/usr/bin/secret-tool',
      ['store', '--label=Catón AI', 'service', 'caton-ai', 'account', 'secret-store-key'],
      KEY,
    ]);
  });

  it('are refused where untested, and failures never carry the value', () => {
    expect(() => {
      osCredentialStore('win32').read('caton-ai', 'key');
    }).toThrow(/not supported on win32 yet/u);
    const failing: Runner = () => {
      throw new Error(`security failed for ${KEY}`);
    };
    expect(() => {
      osCredentialStore('darwin', failing).write('caton-ai', 'key', KEY);
    }).toThrow('Could not write the OS credential store');
  });
});
