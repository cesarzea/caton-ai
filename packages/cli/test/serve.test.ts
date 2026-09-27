import {describe, expect, it} from 'vitest';

import {run} from '../src/app.ts';
import {connectionStatuses} from '../src/connection-status.ts';
import {failingSource, testContext, workingSource} from './context.ts';

describe('caton serve', () => {
  it('starts the web interface and prints the one-time sign-in link', async () => {
    const context = testContext({});

    expect(await run(['serve'], context)).toBe(0);
    expect(await run(['serve', '8080'], context)).toBe(0);
    expect(await run(['serve', 'not-a-port'], context)).toBe(0);
    expect(context.lines.filter(line => line.includes('#token='))).toEqual([
      'http://127.0.0.1:7170/#token=one-time',
      'http://127.0.0.1:8080/#token=one-time',
      'http://127.0.0.1:7170/#token=one-time',
    ]);
  });
});

describe('connectionStatuses', () => {
  it('reports every configured connection, synced or not', async () => {
    const context = testContext({millennium: workingSource, revolut: failingSource});
    await run(['sync'], context);
    const config = {
      instances: [
        ...context.config().instances,
        {id: 'amex', title: 'Amex', plugin: 'email-alerts', settings: {}},
      ],
    };

    expect(connectionStatuses(config, () => context.readOnlyLedger())).toMatchObject([
      {
        id: 'millennium',
        plugin: 'fake',
        lastOutcome: 'ok',
        lastRunAt: '2026-09-27T10:00:00.000Z',
        error: null,
      },
      {id: 'revolut', lastOutcome: 'failed', error: 'Enable Banking consent is not active'},
      {
        id: 'amex',
        title: 'Amex',
        plugin: 'email-alerts',
        lastOutcome: 'never',
        lastRunAt: null,
        lastSuccessfulSyncAt: null,
      },
    ]);
  });
});

describe('connectionStatuses without a ledger', () => {
  it('reports every connection as never synced when there is no ledger', () => {
    const config = {instances: [{id: 'amex', title: 'Amex', plugin: 'email-alerts', settings: {}}]};

    expect(connectionStatuses(config, () => null).map(status => status.lastOutcome)).toEqual([
      'never',
    ]);
  });
});
