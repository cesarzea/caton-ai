import {LedgerUnavailableError} from '@caton-ai/ledger';
import {describe, expect, it} from 'vitest';

import {callTool, textOf} from './clients.ts';
import {testContext} from './fixture.ts';

describe('tool errors', () => {
  it('tell the model how to recover when the ledger is not ready', async () => {
    const context = testContext(() => {
      throw new LedgerUnavailableError('The ledger does not exist yet: run `caton sync` first');
    });
    const result = await callTool(context, 'sync_status');

    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe('The ledger does not exist yet: run `caton sync` first');
  });

  it('keep unexpected details out of the conversation and in the log', async () => {
    const failure = new Error('SQLITE_CORRUPT: /Users/someone/.local/share/caton-ai/ledger.sqlite');
    const context = testContext(() => {
      throw failure;
    });
    const result = await callTool(context, 'list_accounts');

    expect(result.isError).toBe(true);
    expect(textOf(result)).not.toContain('/Users');
    expect(context.logged).toEqual([failure]);
  });

  it('close the ledger after every call, even a failing one', async () => {
    const context = testContext();
    await callTool(context, 'list_accounts');
    await callTool(context, 'list_transactions', {account: 'acct_000'});

    expect(context.closes()).toBe(2);
  });
});
