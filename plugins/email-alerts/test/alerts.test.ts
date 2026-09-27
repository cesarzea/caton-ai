import {money} from '@caton-ai/core';
import {describe, expect, it} from 'vitest';

import {readAlerts} from '../src/index.ts';
import {AUTH_SERVER, message, recipe} from './mail.ts';

const options = {authServer: AUTH_SERVER};

describe('readAlerts', () => {
  it('turns an authentic alert into a booked charge dated by the email', () => {
    const {transactions, unreadable, rejected} = readAlerts([message()], [recipe()], options);

    expect(transactions).toEqual([
      {
        id: expect.stringMatching(/^email:[\da-f]{16}:[\da-f]{16}$/u) as unknown,
        accountId: expect.stringMatching(/^email:[\da-f]{16}$/u) as unknown,
        status: 'booked',
        bookingDate: '2026-09-19',
        valueDate: null,
        transactionDate: '2026-09-19',
        amount: money(-123_456, 'EUR'),
        counterparty: 'EXAMPLE STORE MADRID',
        description: 'Cargo en tu Tarjeta',
        merchantCategoryCode: null,
      },
    ]);
    expect([unreadable, rejected]).toEqual([[], 0]);
  });
});

describe('readAlerts identifiers and options', () => {
  it('gives the same ids on every read, and different ids to different emails', () => {
    const first = readAlerts([message()], [recipe()], options).transactions[0]?.id;
    const again = readAlerts([message()], [recipe()], options).transactions[0]?.id;
    const other = readAlerts([message({messageId: '<alert-2@x>'})], [recipe()], options);

    expect(again).toBe(first);
    expect(other.transactions[0]?.id).not.toBe(first);
  });

  it('reads refunds, currencies and the sending date when the recipe asks for them', () => {
    const refund = recipe({
      direction: 'in',
      fields: {
        amount: 'Importe:\\s*([\\d.,]+)',
        merchant: 'Establecimiento:\\s*(.+)',
        currency: '([€$£])',
      },
    });
    const text = 'Importe: 20,00 $\nEstablecimiento: EXAMPLE SHOP\n';
    const [transaction] = readAlerts([message({text})], [refund], options).transactions;

    expect(transaction).toMatchObject({amount: money(2_000, 'USD'), bookingDate: '2026-09-20'});
  });
});

describe('readAlerts safety', () => {
  it('ignores messages no recipe is meant for, and rejects unauthenticated ones', () => {
    const report = readAlerts(
      [
        message({from: 'news@example-card.com', subject: 'Newsletter'}),
        message({from: 'x@other.example'}),
        message({authenticationResults: []}),
      ],
      [recipe()],
      options,
    );

    expect(report).toEqual({transactions: [], unreadable: [], rejected: 1});
  });
});

describe('readAlerts unreadable emails', () => {
  it('reports every email a recipe cannot read, saying what is missing', () => {
    const report = readAlerts(
      [
        message({text: 'Importe: 5,00\n'}),
        message({text: 'Establecimiento: X\n'}),
        message({text: 'Importe: 5,00\nEstablecimiento: X\nFecha: 31/02/2026'}),
        message({
          text: null,
          html: '<p>Importe: 1,234</p><p>Establecimiento: X</p><p>Fecha: 01/09/2026</p>',
        }),
      ],
      [recipe()],
      options,
    );

    expect(report.unreadable.map(line => line.split(': ').at(-1))).toEqual([
      'no merchant found',
      'no amount found',
      'no valid date found',
      'amount 1.234 is not valid in EUR',
    ]);
  });
});
