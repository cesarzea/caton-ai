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

    expect(connectionStatuses(config.instances, () => context.readOnlyLedger())).toMatchObject([
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

    expect(
      connectionStatuses(config.instances, () => null).map(status => status.lastOutcome),
    ).toEqual(['never']);
  });
});

describe('caton serve syncing', () => {
  it('lets the web interface sync connections with the secrets of the open store', async () => {
    let runner:
      | ((names: readonly string[], lookup: (key: string) => string | undefined) => Promise<void>)
      | undefined;
    const context = {
      ...testContext({millennium: workingSource, revolut: failingSource}),
      startWeb: (port: number, sync: NonNullable<typeof runner>) => {
        runner = sync;
        return Promise.resolve({
          origin: `http://127.0.0.1:${String(port)}`,
          accessLink: () => 'link',
        });
      },
    };
    await run(['serve'], context);
    await runner?.(['revolut'], () => undefined);

    expect(context.ledger().lastRun('revolut')?.outcome).toBe('failed');
    expect(context.ledger().lastRun('millennium')).toBeNull();
  });
});

describe('connectionStatuses after a change', () => {
  it('says when a connection changed after its last sync', async () => {
    const context = testContext({millennium: workingSource});
    await run(['sync'], context);
    const [before, after] = ['2026-09-27T09:00:00.000Z', '2026-09-27T11:00:00.000Z'].map(
      changedAt => ({
        id: 'millennium',
        title: 'Millennium',
        plugin: 'fake',
        settings: {},
        changedAt,
      }),
    );

    expect(
      connectionStatuses(before === undefined ? [] : [before], () => context.readOnlyLedger())[0]
        ?.changedSinceSync,
    ).toBe(false);
    expect(
      connectionStatuses(after === undefined ? [] : [after], () => context.readOnlyLedger())[0]
        ?.changedSinceSync,
    ).toBe(true);
  });
});
