import {describe, expect, it} from 'vitest';

import {run} from '../src/app.ts';
import {testContext} from './context.ts';

const FIRST_FORMAT = {
  plugins: {'enable-banking': {appId: 'app-1', privateKey: 'file:~/.config/caton-ai/app.pem'}},
  connections: [
    {name: 'millennium', type: 'enable-banking', sessionId: 'session-1'},
    {name: 'wise', type: 'enable-banking', sessionId: 'session-2'},
  ],
};

describe('caton config migrate', () => {
  it('turns connections into instances that keep their ids, dropping secret references', async () => {
    const context = testContext({});
    context.file.current = FIRST_FORMAT;

    expect(await run(['config', 'migrate'], context)).toBe(0);
    expect(context.file.current).toEqual({
      instances: [
        {
          id: 'millennium',
          title: 'Millennium',
          plugin: 'enable-banking',
          settings: {'app-id': 'app-1', 'session-id': 'session-1'},
        },
        {
          id: 'wise',
          title: 'Wise',
          plugin: 'enable-banking',
          settings: {'app-id': 'app-1', 'session-id': 'session-2'},
        },
      ],
    });
    expect(context.lines).toEqual([
      '✓ Configuration migrated to 2 instance(s); backup: /config/config.json.bak-2026-09-27',
      '  Enter in the web interface (caton serve): Millennium: private-key',
      '  Enter in the web interface (caton serve): Wise: private-key',
    ]);
  });
});

describe('caton config migrate, again', () => {
  it('leaves a migrated configuration alone and explains its usage', async () => {
    const context = testContext({});
    context.file.current = {instances: []};

    expect(await run(['config', 'migrate'], context)).toBe(0);
    expect(await run(['config'], context)).toBe(2);
    expect(context.file.written).toEqual([]);
    expect(context.lines).toEqual([
      'The configuration already uses instances',
      'Usage: caton config migrate',
    ]);
  });
});
