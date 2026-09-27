import {currencyCode} from '@caton-ai/core';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {EnableBankingError, createEnableBankingSource} from '../src/index.ts';
import {createApiClient} from '../src/http.ts';
import {fakeFetch, json, privateKeyPem} from './fake-api.ts';

afterEach(() => {
  vi.useRealTimers();
});

describe('pagination guard', () => {
  it('stops following a continuation key that never ends', async () => {
    const endless = (): Response => json({transactions: [], continuation_key: 'again'});
    const source = createEnableBankingSource({
      appId: 'a',
      privateKeyPem,
      sessionId: 's',
      fetch: fakeFetch({'/accounts/uid/transactions': endless}),
    });
    const account = {
      id: 'eb:x',
      sourceRef: 'uid',
      source: 'enable-banking',
      institution: 'B',
      name: 'A',
      currency: currencyCode('EUR'),
    };

    await expect(source.listTransactions(account, '2026-09-01')).rejects.toBeInstanceOf(
      EnableBankingError,
    );
  });
});

describe('default retry delay', () => {
  it('waits before retrying a transient gateway error', async () => {
    vi.useFakeTimers();
    const statuses = [502, 200];
    const api = createApiClient({
      appId: 'a',
      privateKeyPem,
      fetch: fakeFetch({'/ping': () => json({ok: true}, statuses.shift())}),
    });

    const result = api.get('/ping');
    await vi.advanceTimersByTimeAsync(1_000);
    expect(await result).toEqual({ok: true});
  });
});
