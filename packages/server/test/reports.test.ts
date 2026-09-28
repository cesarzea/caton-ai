import {documentListSchema, spendReportSchema, upcomingListSchema} from '@caton-ai/api';
import {describe, expect, it} from 'vitest';

import {call, signIn, started} from './harness.ts';

const MONTH = {
  month: '2026-09',
  currency: 'EUR',
  total: '10.00',
  onlyInDocuments: '0.00',
  notSeen: '2.00',
};

describe('reports', () => {
  it('serve spending, documents and upcoming charges to a signed-in page only', async () => {
    const running = await started({
      reports: {
        spend: () => ({cash: [MONTH], accrual: []}),
        documents: () => ({documents: []}),
        upcoming: () => ({
          charges: [
            {
              issuer: 'X',
              amount: null,
              currency: null,
              date: '2026-10-01',
              account: null,
              verified: true,
            },
          ],
        }),
      },
    });
    const cookie = await signIn(running);
    const get = async (path: string, headers = {cookie}) => call(running.port, {path, headers});

    expect(spendReportSchema.parse(JSON.parse((await get('/api/spend')).body)).cash).toEqual([
      MONTH,
    ]);
    expect(documentListSchema.parse(JSON.parse((await get('/api/documents')).body))).toEqual({
      documents: [],
    });
    expect(
      upcomingListSchema.parse(JSON.parse((await get('/api/upcoming')).body)).charges,
    ).toHaveLength(1);
    expect((await get('/api/spend', {cookie: ''})).status).toBe(401);
  });
});
