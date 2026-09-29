import type {DocumentInfo} from '@caton-ai/api';
import {cleanup, screen, within} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';

import {fakeApi} from './fake-api.ts';
import type {FakeApi} from './fake-api.ts';
import {openApp} from './render.tsx';

afterEach(cleanup);

const info = (overrides: Partial<DocumentInfo>): DocumentInfo => ({
  kind: 'receipt',
  issuer: 'Example Store',
  amount: '9.99',
  currency: 'EUR',
  issuedOn: '2026-09-10',
  periodStart: null,
  periodEnd: null,
  dueOn: null,
  reference: null,
  account: null,
  verified: true,
  linked: true,
  origin: 'email from receipts@store.example: Your receipt',
  ...overrides,
});

function withData(): FakeApi {
  const api = fakeApi({state: 'unlocked', keySource: 'passphrase'});
  const month = {
    month: '2026-09',
    currency: 'EUR',
    total: '120.00',
    onlyInDocuments: '25.00',
    notSeen: '0.00',
  };
  api.reports = {
    spend: {cash: [month], accrual: [{...month, total: '40.00'}]},
    documents: [info({}), info({issuer: 'Cloud', verified: false, linked: false, amount: null})],
    upcoming: [
      {
        issuer: 'Streaming',
        amount: '20.99',
        currency: 'EUR',
        date: '2026-10-06',
        account: 'ending in 1234',
        verified: true,
      },
    ],
  };
  return api;
}

describe('the reports of the page', () => {
  it('show upcoming charges and spending, on either basis', async () => {
    const {user} = openApp(withData());

    expect(await screen.findByRole('heading', {name: 'Upcoming charges'})).toBeDefined();
    expect(
      screen.getByRole('rowheader', {name: '2026-10-06'}).closest('tr')?.textContent,
    ).toContain('Streaming');
    const spending = screen.getByRole('rowheader', {name: '2026-09'}).closest('tr');
    expect(within(spending ?? document.body).getByText('€120.00')).toBeDefined();
    await user.click(screen.getByRole('button', {name: 'Over the period paid for'}));
    expect(screen.getByRole('rowheader', {name: '2026-09'}).closest('tr')?.textContent).toContain(
      '€40.00',
    );
  });

  it('list documents with their state, filtered to what needs a look', async () => {
    const {user} = openApp(withData());
    await screen.findByRole('heading', {name: 'Documents'});

    expect(screen.getAllByText(/Your receipt/u)).toHaveLength(2);
    await user.selectOptions(screen.getByRole('combobox', {name: 'Show'}), 'To review');
    expect(screen.queryByText('Example Store')).toBeNull();
    expect(screen.getByText('Cloud')).toBeDefined();
  });

  it('stay hidden while the ledger is empty', async () => {
    openApp(fakeApi({state: 'unlocked', keySource: 'passphrase'}));

    expect(await screen.findByRole('heading', {name: 'Connections'})).toBeDefined();
    expect(screen.queryByRole('heading', {name: 'Spending'})).toBeNull();
  });
});
