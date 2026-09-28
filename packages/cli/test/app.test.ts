import {money} from '@caton-ai/core';
import {describe, expect, it} from 'vitest';

import {run} from '../src/app.ts';
import {failingSource, testContext, workingSource} from './context.ts';

describe('caton sync', () => {
  it('reports every connection and fails when one of them fails', async () => {
    const context = testContext({millennium: workingSource, revolut: failingSource});

    expect(await run(['sync'], context)).toBe(1);
    expect(context.lines).toEqual(['✓ millennium: 1 account(s), 1 movement(s)']);
    expect(context.errors).toEqual(['✗ revolut: Enable Banking consent is not active']);
  });

  it('leaves model instances out: they serve connections and never sync', async () => {
    const base = testContext({millennium: workingSource});
    const model = {id: 'claude', title: 'Claude', plugin: 'model-fake', settings: {}};
    const context = {...base, config: () => ({instances: [...base.config().instances, model]})};

    expect(await run(['sync'], context)).toBe(0);
    expect(await run(['status'], context)).toBe(0);
    expect(await run(['spend'], context)).toBe(0);
    expect(base.lines[0]).toBe('✓ millennium: 1 account(s), 1 movement(s)');
    expect(base.lines.join('\n')).not.toContain('claude');
  });
});

describe('caton accounts and spend', () => {
  it('list accounts with balances and spend per month', async () => {
    const context = testContext({millennium: workingSource});
    await run(['sync'], context);

    expect(await run(['accounts'], context)).toBe(0);
    expect(await run(['spend', '2'], context)).toBe(0);
    expect(context.lines.slice(1)).toEqual([
      'Institution   Account          Balance',
      'Example Bank  Current account  €1,234.56',
      'Month    Spending  Only in documents',
      '2026-09  €160.00   —',
    ]);
  });

  it('warn that totals are incomplete while a connection is failing', async () => {
    const context = testContext({millennium: workingSource, revolut: failingSource});
    await run(['sync'], context);

    expect(await run(['spend'], context)).toBe(1);
    expect(context.errors.at(-1)).toBe('⚠ Incomplete: last sync failed or never ran for revolut');
  });
});

describe('caton status and help', () => {
  it('shows the last sync of each connection', async () => {
    const context = testContext({millennium: workingSource});

    expect(await run(['status'], context)).toBe(1);
    await run(['sync'], context);
    expect(await run(['status'], context)).toBe(0);
    expect(context.lines).toContain('Model prices: downloaded 2026-09-27T00:00:00.000Z');
    expect(context.lines.findLast(line => line.startsWith('millennium'))).toMatch(
      /^millennium\s+ok\s+2026-09-27T10:00:00.000Z$/u,
    );
  });

  it('prints usage, failing on unknown commands', async () => {
    const context = testContext({});

    expect(await run([], context)).toBe(0);
    expect(await run(['launch'], context)).toBe(2);
    expect(context.lines[0]).toBe('Usage: caton <command>');
  });

  it('lists nothing before the first sync', async () => {
    const context = testContext({});

    expect(await run(['accounts'], context)).toBe(0);
    expect(context.lines).toEqual(['No accounts yet. Run: caton sync']);
  });
});

const RECEIPT = {
  id: 'email:<1@x>',
  kind: 'receipt',
  issuer: 'Example AI Inc',
  amount: money(16_000, 'EUR'),
  issuedOn: '2026-09-15',
  periodStart: null,
  periodEnd: null,
  dueOn: null,
  reference: null,
  account: null,
  verified: false,
  origin: 'email',
} as const;

describe('caton documents', () => {
  it('says when there are none', async () => {
    const context = testContext({millennium: workingSource});

    expect(await run(['documents', '30'], context)).toBe(0);
    expect(context.lines.at(-1)).toBe('No documents in the last 30 days.');
  });

  it('lists documents with their state', async () => {
    const context = testContext({millennium: workingSource});
    const at = new Date('2026-09-27T09:00:00Z');
    context.ledger().saveSync({
      source: 'mail',
      startedAt: at,
      finishedAt: at,
      accounts: [],
      documents: [RECEIPT],
    });

    expect(await run(['documents'], context)).toBe(0);
    expect(context.lines.at(-1)).toMatch(
      /^2026-09-15\s+receipt\s+Example AI Inc\s+€160\.00\s+to review\s+—$/u,
    );
    expect(context.errors.at(-1)).toBe(
      '⚠ 1 document(s) to review: their fields are not all written in the email',
    );
  });
});

describe('caton documents linked and without amount', () => {
  it('shows which are linked to a movement, and a dash for a missing amount', async () => {
    const context = testContext({millennium: workingSource});
    await run(['sync'], context);
    const at = new Date('2026-09-27T09:00:00Z');
    const loose = {...RECEIPT, id: 'email:<2@x>', amount: null};
    const ledger = context.ledger();
    ledger.saveSync({
      source: 'mail',
      startedAt: at,
      finishedAt: at,
      accounts: [],
      documents: [RECEIPT, loose],
    });
    ledger.linkDocuments([{documentId: RECEIPT.id, transactionId: 'eb:hash-abc:1'}], at);

    expect(await run(['documents'], context)).toBe(0);
    expect(context.lines.some(line => /Example AI Inc\s+—\s+to review\s+—$/u.test(line))).toBe(
      true,
    );
    expect(context.lines.some(line => /€160\.00\s+to review\s+linked$/u.test(line))).toBe(true);
  });
});
