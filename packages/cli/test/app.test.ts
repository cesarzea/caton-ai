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
      'Month    Outflows',
      '2026-09  €160.00',
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
    expect(context.lines.at(-1)).toMatch(/^millennium\s+ok\s+2026-09-27T10:00:00.000Z$/u);
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
