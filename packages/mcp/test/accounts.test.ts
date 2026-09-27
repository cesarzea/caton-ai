import {describe, expect, it} from 'vitest';

import {callTool, textOf} from './clients.ts';
import {SESSION_UID, testContext} from './fixture.ts';

describe('sync_status', () => {
  it('reports every connection, masking identifiers in errors', async () => {
    const result = await callTool(testContext(), 'sync_status');

    expect(result.structuredContent).toEqual({
      connections: [
        {
          connection: 'millennium',
          lastOutcome: 'ok',
          lastRunAt: '2026-09-27T10:00:00.000Z',
          lastSuccessfulSyncAt: '2026-09-27T10:00:00.000Z',
          error: null,
        },
        {
          connection: 'revolut',
          lastOutcome: 'failed',
          lastRunAt: '2026-09-27T10:02:00.000Z',
          lastSuccessfulSyncAt: null,
          error: 'Enable Banking returned HTTP 500 for /accounts/…/transactions',
        },
      ],
      freshness: {complete: false, incompleteConnections: ['revolut'], oldestSuccessfulSync: null},
    });
    expect(textOf(result)).not.toContain(SESSION_UID);
  });
});

describe('sync_status before the first sync', () => {
  it('reports connections that never synced', async () => {
    const context = {...testContext(), connections: ['wise']};
    const result = await callTool(context, 'sync_status');

    expect(result.structuredContent).toMatchObject({
      connections: [{connection: 'wise', lastOutcome: 'never', lastRunAt: null, error: null}],
    });
  });
});

describe('list_accounts', () => {
  it('lists accounts under opaque handles with exact balances', async () => {
    const result = await callTool(testContext(), 'list_accounts');

    expect(result.structuredContent).toMatchObject({
      accounts: [
        {
          account: expect.stringMatching(/^acct_[\da-f]{12}$/u) as unknown,
          institution: 'Example Bank',
          name: 'Current account',
          currency: 'EUR',
          balances: [
            {type: 'CLBD', amount: '1234.56', currency: 'EUR', referenceDate: '2026-09-26'},
          ],
        },
      ],
    });
  });

  it('never exposes ledger ids or session references', async () => {
    const text = textOf(await callTool(testContext(), 'list_accounts'));

    expect(text).not.toContain('eb:');
    expect(text).not.toContain('session-uid');
  });

  it('dates the data from the least recently synced connection', async () => {
    const context = {...testContext(), connections: ['millennium']};
    const result = await callTool(context, 'list_accounts');

    expect(result.structuredContent).toMatchObject({
      freshness: {complete: true, oldestSuccessfulSync: '2026-09-27T10:00:00.000Z'},
    });
  });
});
