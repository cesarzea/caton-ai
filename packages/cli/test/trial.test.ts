import {money, PartialReadError} from '@caton-ai/core';
import type {FinancialDocument} from '@caton-ai/core';
import {describe, expect, it} from 'vitest';

import {run} from '../src/app.ts';
import type {SourceFor} from '../src/connectors.ts';
import {testContext, workingSource} from './context.ts';

const doc = (id: string, minorUnits: number, verified = true): FinancialDocument => ({
  id,
  kind: 'receipt',
  issuer: 'Example',
  amount: money(minorUnits, 'EUR'),
  issuedOn: '2026-09-10',
  periodStart: null,
  periodEnd: null,
  dueOn: null,
  reference: null,
  verified,
  origin: 'email',
});

const usage = {
  provider: 'x',
  model: 'x',
  inputTokens: 1,
  cacheReadTokens: null,
  cacheWriteTokens: null,
  outputTokens: 1,
  reportedCostUsd: null,
};

/** Two models reading two emails: they agree on one and differ on the other; the third fails. */
const byModel: SourceFor = (instance, _lookup, hooks) => {
  const model = hooks?.modelInstance ?? '';
  hooks?.onModelCall?.({connection: instance.id, modelInstance: model, outcome: 'ok', usage});
  const read: Record<string, () => Promise<FinancialDocument[]>> = {
    cheap: () => Promise.resolve([doc('a', 999), doc('b', 100, false)]),
    good: () => Promise.resolve([doc('a', 999), doc('b', 1000)]),
    broken: () => Promise.reject(new PartialReadError('rate limited', [doc('a', 999)])),
  };
  return {
    ...workingSource,
    listDocuments: read[model] ?? (() => Promise.reject(new Error('offline'))),
  };
};

/** A context whose configuration also holds the models the trials use. */
function trialContext(): ReturnType<typeof testContext> {
  const base = testContext({mail: workingSource});
  const models = ['cheap', 'good', 'broken', 'gone'].map(id => ({
    id,
    title: id,
    plugin: 'model-fake',
    settings: {},
  }));
  return {
    ...base,
    source: byModel,
    config: () => ({instances: [...base.config().instances, ...models]}),
  };
}

describe('caton trial', () => {
  it('reads the same emails with each model and shows where they differ', async () => {
    const context = trialContext();

    expect(await run(['trial', 'mail', 'cheap', 'good', '--emails', '5'], context)).toBe(0);
    expect(context.lines[0]).toMatch(
      /^Model\s+Emails\s+Documents\s+Verified\s+Cost\s+Seconds\s+Problem$/u,
    );
    expect(context.lines[1]).toMatch(/^cheap\s+1\s+2\s+1\s+\$0\.0015\s+\d/u);
    expect(context.lines).toContain('Same reading by every model: 1 of 2 document(s)');
    expect(context.lines.at(-1)).toBe(
      '  b: cheap → receipt 1 EUR (to review) | good → receipt 10 EUR',
    );
  });

  it('reports models that fail, and refuses incomplete arguments', async () => {
    const context = trialContext();

    expect(await run(['trial', 'mail', 'broken', 'gone'], context)).toBe(1);
    expect(context.lines.some(line => line.includes('rate limited'))).toBe(true);
    expect(context.lines.some(line => line.includes('offline'))).toBe(true);
    expect(await run(['trial', 'mail'], context)).toBe(2);
    expect(await run(['trial', 'nobody', 'cheap'], context)).toBe(2);
    expect(await run(['trial', 'mail', 'cheap', 'luna'], context)).toBe(2);
    expect(context.errors.at(-1)).toBe(
      'Unknown model(s): luna. Configured models: cheap, good, broken, gone; add them under Language models in caton serve.',
    );
    expect(context.errors).toContain(
      'Usage: caton trial <connection> <model> <model>… [--emails N]',
    );
  });
});
