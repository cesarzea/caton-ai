import {describe, expect, it} from 'vitest';

import {money, topCounterparties} from '../src/index.ts';
import {transaction} from './transactions.ts';

describe('topCounterparties', () => {
  it('adds booked outflows per counterparty, largest first', () => {
    const top = topCounterparties(
      [
        transaction({counterparty: 'Example AI Inc', amount: money(-16_000, 'EUR')}),
        transaction({counterparty: 'Example AI Inc', amount: money(-9_000, 'EUR')}),
        transaction({counterparty: 'Example Grocer', amount: money(-4_000, 'EUR')}),
        transaction({counterparty: 'Example Employer', amount: money(250_000, 'EUR')}),
        transaction({
          counterparty: 'Example Grocer',
          status: 'pending',
          amount: money(-500, 'EUR'),
        }),
      ],
      10,
    );

    expect(top).toEqual([
      {name: 'Example AI Inc', total: money(25_000, 'EUR'), movements: 2},
      {name: 'Example Grocer', total: money(4_000, 'EUR'), movements: 1},
    ]);
  });
});

describe('topCounterparties grouping', () => {
  it('falls back to the description and keeps currencies apart', () => {
    const top = topCounterparties(
      [
        transaction({counterparty: null, description: ' Rent ', amount: money(-90_000, 'EUR')}),
        transaction({counterparty: null, description: 'Rent', amount: money(-1_000, 'USD')}),
      ],
      10,
    );

    expect(top.map(({name, total}) => [name, total.currency])).toEqual([
      ['Rent', 'EUR'],
      ['Rent', 'USD'],
    ]);
  });

  it('returns at most `limit` entries, ties in name order', () => {
    const top = topCounterparties(
      ['B', 'A', 'C'].map(name => transaction({counterparty: name})),
      2,
    );

    expect(top.map(({name}) => name)).toEqual(['A', 'B']);
  });
});
