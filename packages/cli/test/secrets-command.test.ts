import {describe, expect, it} from 'vitest';

import {run} from '../src/app.ts';
import {testContext} from './context.ts';

describe('caton secrets init', () => {
  it('creates the store with the chosen key source', async () => {
    const context = testContext({});

    expect(await run(['secrets', 'init', 'passphrase'], context)).toBe(0);
    expect(await run(['secrets', 'init', 'os-store'], context)).toBe(0);
    expect(await run(['secrets', 'init', 'file', '/run/secrets/caton-key'], context)).toBe(0);
    expect(context.created).toEqual([
      {source: 'passphrase'},
      {source: 'os-store'},
      {source: 'file', path: '/run/secrets/caton-key'},
    ]);
    expect(context.lines[0]).toBe('✓ Secret store created; its key is kept by: passphrase');
  });

  it('explains its usage when the arguments are incomplete', async () => {
    const context = testContext({});

    for (const args of [
      ['secrets'],
      ['secrets', 'init', 'file'],
      ['secrets', 'set'],
      ['secrets', 'init', 'keychain'],
    ]) {
      expect(await run(args, context)).toBe(2);
    }
    expect(context.lines[0]).toBe('Usage: caton secrets <action>');
  });
});

describe('caton secrets set, list and remove', () => {
  it('store typed values and never print them', async () => {
    const context = testContext({});
    context.typed.push('app-password-value', '');

    expect(await run(['secrets', 'set', 'jaunesistemas-imap'], context)).toBe(0);
    expect(await run(['secrets', 'set', 'empty'], context)).toBe(1);
    expect(await run(['secrets', 'list'], context)).toBe(0);
    expect(await run(['secrets', 'remove', 'jaunesistemas-imap'], context)).toBe(0);
    expect(await run(['secrets', 'remove', 'jaunesistemas-imap'], context)).toBe(1);
    await run(['secrets', 'list'], context);

    expect(context.lines).toEqual([
      '✓ Secret "jaunesistemas-imap" saved; other values can use it as ${jaunesistemas-imap}',
      'jaunesistemas-imap',
      '✓ Secret "jaunesistemas-imap" removed',
      'No secret named "jaunesistemas-imap"',
      'No secrets yet',
    ]);
    expect(JSON.stringify([context.lines, context.errors])).not.toContain('app-password-value');
  });
});
