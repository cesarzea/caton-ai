import {describe, expect, it} from 'vitest';

import {createEmailAlertsSource} from '../src/index.ts';
import type {MailMessage, Mailbox} from '../src/index.ts';
import {AUTH_SERVER, message, recipe} from './mail.ts';

function mailbox(messages: readonly MailMessage[]): Mailbox & {readonly calls: unknown[][]} {
  const calls: unknown[][] = [];
  return {
    calls,
    messagesFrom: (domains, since) => {
      calls.push([domains, since.toISOString()]);
      return Promise.resolve(messages);
    },
  };
}

const august = message({
  messageId: '<old@x>',
  text: 'Importe: 9,00\nEstablecimiento: OLD\nFecha: 20/08/2026',
});

function source(box: Mailbox): ReturnType<typeof createEmailAlertsSource> {
  const second = recipe({id: 'example-card-refund', subject: 'abono', direction: 'in'});
  return createEmailAlertsSource({
    authServer: AUTH_SERVER,
    mailbox: box,
    recipes: [recipe(), second],
  });
}

describe('email alerts source', () => {
  it('has one account per institution and name, without balances', async () => {
    const alerts = source(mailbox([]));
    const accounts = await alerts.listAccounts();

    expect(accounts).toMatchObject([
      {institution: 'Example Card', name: 'Gold', source: 'email-alerts'},
    ]);
    for (const account of accounts) {
      expect(await alerts.listBalances(account)).toEqual([]);
    }
  });
});

describe('email alerts source accounts', () => {
  it('are the same card whichever mailbox or recipe feeds them', async () => {
    const [fromCharges] = await source(mailbox([])).listAccounts();
    const refunds = createEmailAlertsSource({
      authServer: AUTH_SERVER,
      mailbox: mailbox([]),
      recipes: [recipe({id: 'other-mailbox-refund', direction: 'in'})],
    });

    expect((await refunds.listAccounts())[0]?.id).toBe(fromCharges?.id);
  });
});

describe('email alerts source reads', () => {
  it('searches once per sync, with a margin, and keeps movements from the requested date', async () => {
    const box = mailbox([message(), august]);
    const alerts = source(box);
    const [account] = await alerts.listAccounts();
    if (account === undefined) {
      throw new Error('no account');
    }

    const transactions = await alerts.listTransactions(account, '2026-09-01');
    await alerts.listTransactions(account, '2026-09-01');

    expect(transactions.map(transaction => transaction.counterparty)).toEqual([
      'EXAMPLE STORE MADRID',
    ]);
    expect(box.calls).toEqual([[['example-card.com'], '2026-08-29T00:00:00.000Z']]);
  });

  it('fails the sync when an email cannot be read, so that a format change shows up', async () => {
    const alerts = source(mailbox([message({text: 'nothing useful'})]));
    const [account] = await alerts.listAccounts();
    if (account === undefined) {
      throw new Error('no account');
    }

    await expect(alerts.listTransactions(account, '2026-09-01')).rejects.toThrow(
      /1 email\(s\) could not be read with their recipe; fix the recipe: example-card-charge/u,
    );
  });
});
