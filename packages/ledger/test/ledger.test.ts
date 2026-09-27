import {money} from '@caton-ai/core';
import {describe, expect, it} from 'vitest';

import {openLedger} from '../src/index.ts';
import {account, movement, snapshot} from './snapshot.ts';

describe('ledger round trip', () => {
  it('stores accounts, movements and balances exactly', () => {
    const ledger = openLedger(':memory:');
    ledger.saveSync(snapshot([movement()]));

    expect(ledger.accounts()).toEqual([account]);
    expect(ledger.transactions('2026-09-01')).toEqual([movement()]);
    expect(ledger.latestBalances()[0]?.amount).toEqual(money(123_456, 'EUR'));
    expect(ledger.lastRun('millennium')).toMatchObject({outcome: 'ok', error: null});
  });

  it('does not duplicate movements when the same sync is saved twice', () => {
    const ledger = openLedger(':memory:');
    ledger.saveSync(snapshot([movement()]));
    ledger.saveSync(snapshot([movement()], '2026-09-27T16:00:00Z'));

    expect(ledger.transactions('2026-01-01')).toHaveLength(1);
  });
});

describe('pending movements', () => {
  it('are replaced, so a pending payment booked under a new id is counted once', () => {
    const ledger = openLedger(':memory:');
    const pending = movement({id: 'eb:hash-abc:pdng-1', status: 'pending', bookingDate: null});
    ledger.saveSync(snapshot([pending]));
    ledger.saveSync(snapshot([movement({id: 'eb:hash-abc:ref-9'})], '2026-09-28T10:00:00Z'));

    expect(ledger.transactions('2026-09-01').map(item => item.id)).toEqual(['eb:hash-abc:ref-9']);
  });
});

describe('failures and atomicity', () => {
  it('records failed syncs', () => {
    const ledger = openLedger(':memory:');
    ledger.recordFailure({
      source: 'millennium',
      startedAt: new Date('2026-09-27T10:00:00Z'),
      finishedAt: new Date('2026-09-27T10:00:05Z'),
      error: 'Enable Banking consent is not active',
    });

    expect(ledger.lastRun('millennium')).toMatchObject({
      outcome: 'failed',
      error: 'Enable Banking consent is not active',
    });
    expect(ledger.lastRun('revolut')).toBeNull();
  });

  it('saves nothing when any part of a sync is invalid', () => {
    const ledger = openLedger(':memory:');
    const orphan = movement({id: 'x:1', accountId: 'eb:unknown-account'});

    expect(() => {
      ledger.saveSync(snapshot([movement(), orphan]));
    }).toThrow();
    expect(ledger.accounts()).toEqual([]);
    expect(ledger.lastRun('millennium')).toBeNull();
    ledger.close();
  });
});
