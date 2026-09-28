import {PartialReadError} from '@caton-ai/core';
import {describe, expect, it} from 'vitest';

import {createEmailSource} from '../src/index.ts';
import {AUTH_SERVER, CHARGE, fakeMailbox, fakeModel, memoryState, message} from './mail.ts';

type Options = Parameters<typeof createEmailSource>[0];

function source(overrides: Partial<Options>) {
  return createEmailSource({
    mailbox: fakeMailbox([message()]),
    model: fakeModel([CHARGE]),
    state: memoryState(),
    since: new Date('2026-07-01T00:00:00Z'),
    ownAddress: 'me@my-company.example',
    authServer: AUTH_SERVER,
    cardDomains: [],
    cardCurrency: 'EUR',
    maxPerSync: 50,
    ...overrides,
  });
}

describe('reading email with a model', () => {
  it('turns an authenticated email into a verified document and remembers where it stopped', async () => {
    const state = memoryState();
    const documents = await source({state}).listDocuments?.('2026-09-01');

    expect(documents).toEqual([
      {
        id: 'email:<alert-1@alerts.example-card.com>',
        kind: 'charge',
        issuer: 'EXAMPLE STORE MADRID',
        amount: {minorUnits: 123_456, currency: 'EUR'},
        issuedOn: '2026-09-19',
        periodStart: null,
        periodEnd: null,
        dueOn: null,
        reference: null,
        verified: true,
        origin: 'email from no-reply@alerts.example-card.com: Cargo en tu Tarjeta',
      },
    ]);
    expect(state.value).toEqual({uidValidity: 9, lastUid: 1});
  });
});

describe('reading card alerts', () => {
  it('makes movements only for the cards listed by their authenticated sender', async () => {
    const card = source({cardDomains: ['example-card.com']});
    const [account] = await card.listAccounts();

    expect(account).toMatchObject({id: 'email:example-card.com', currency: 'EUR'});
    expect(
      account === undefined ? [] : await card.listTransactions(account, '2026-09-01'),
    ).toMatchObject([
      {
        amount: {minorUnits: -123_456},
        counterparty: 'EXAMPLE STORE MADRID',
        bookingDate: '2026-09-19',
      },
    ]);
    expect(await source({}).listAccounts()).toEqual([]);
  });
});

describe('what the model is not trusted with', () => {
  it('leaves unverified what the email does not literally say', async () => {
    const invented = {...CHARGE, amount_written: '999,00 €'};
    const [document] = (await source({model: fakeModel([invented])}).listDocuments?.('')) ?? [];

    expect(document).toMatchObject({verified: false, amount: {minorUnits: 99_900}});
    const card = source({model: fakeModel([invented]), cardDomains: ['example-card.com']});
    const [account] = await card.listAccounts();
    expect(account === undefined ? [] : await card.listTransactions(account, '')).toEqual([]);
  });

  it('never sends own, unauthenticated or amount-less email, and drops what is not money', async () => {
    const model = fakeModel([{...CHARGE, kind: 'none'}]);
    const mailbox = fakeMailbox([
      message({from: 'billing@my-company.example'}),
      message({authenticationResults: [`${AUTH_SERVER}; dkim=fail header.d=example-card.com`]}),
      message({text: 'Your weekly news', subject: 'News'}),
      message(),
    ]);

    expect(await source({model, mailbox}).listDocuments?.('')).toEqual([]);
    expect(model.seen).toHaveLength(1);
  });
});

describe('reading email when something stops it', () => {
  it('keeps what was read before a model failure, and the cursor right before it', async () => {
    const state = memoryState();
    const mailbox = fakeMailbox([
      message(),
      message({messageId: '<2@x>'}),
      message({messageId: '<3@x>'}),
    ]);
    const model = fakeModel([CHARGE, new Error('rate limited')]);
    const failing = source({mailbox, model, state}).listDocuments?.('');

    const error: unknown = await failing?.catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(PartialReadError);
    expect((error as PartialReadError).documents).toHaveLength(1);
    expect((error as Error).message).toBe(
      'the model could not read an email from alerts.example-card.com: rate limited',
    );
    expect(state.value).toEqual({uidValidity: 9, lastUid: 1});
  });
});

describe('reading email in several syncs', () => {
  it('stops at the per-sync cap and continues from the cursor next time', async () => {
    const state = memoryState();
    const mailbox = fakeMailbox([message(), message({messageId: '<2@x>'})]);
    await source({mailbox, state, maxPerSync: 1}).listDocuments?.('');
    const second = fakeModel([CHARGE]);
    await source({mailbox, state, model: second}).listDocuments?.('');

    expect(mailbox.asked).toEqual([null, {uidValidity: 9, lastUid: 1}]);
    expect(second.seen).toHaveLength(1);
    expect(state.value).toEqual({uidValidity: 9, lastUid: 2});
  });

  it('sends nothing without a model, saying how many emails one would read', async () => {
    const state = memoryState();
    const mailbox = fakeMailbox([message(), message({messageId: '<2@x>'})]);

    await expect(source({mailbox, state, model: undefined}).listDocuments?.('')).rejects.toThrow(
      'No language model is chosen for this connection, so no email was sent to one. 2 email(s) from 1 sender(s) since 2026-07-01 would be read (alerts.example-card.com 2).',
    );
    expect(state.value).toBeNull();
  });
});

describe('reading refunds and notices of email-only cards', () => {
  it('turns a refund into money back, and a renewal notice into a document only', async () => {
    const refund = {...CHARGE, kind: 'refund'};
    const renewal = {...CHARGE, kind: 'renewal'};
    const mailbox = fakeMailbox([message(), message({messageId: '<2@x>'})]);
    const card = source({
      mailbox,
      model: fakeModel([refund, renewal]),
      cardDomains: ['example-card.com'],
    });
    const [account] = await card.listAccounts();
    const movements = account === undefined ? [] : await card.listTransactions(account, '');

    expect(movements.map(movement => movement.amount.minorUnits)).toEqual([123_456]);
    expect((await card.listDocuments?.(''))?.map(document => document.kind)).toEqual([
      'refund',
      'renewal',
    ]);
  });
});
