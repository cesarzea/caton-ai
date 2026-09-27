import type {SQLOutputValue} from 'node:sqlite';

import {currencyCode, money} from '@caton-ai/core';
import type {Account, Balance, Transaction, TransactionStatus} from '@caton-ai/core';

export type Row = Record<string, SQLOutputValue>;

function text(row: Row, column: string): string {
  const value = row[column];
  if (typeof value !== 'string') {
    throw new TypeError(`Ledger column ${column} is not text`);
  }
  return value;
}

function optionalText(row: Row, column: string): string | null {
  return row[column] === null ? null : text(row, column);
}

function integer(row: Row, column: string): number {
  const value = row[column];
  if (typeof value !== 'number' && typeof value !== 'bigint') {
    throw new TypeError(`Ledger column ${column} is not an integer`);
  }
  return Number(value);
}

function status(row: Row): TransactionStatus {
  return text(row, 'status') === 'pending' ? 'pending' : 'booked';
}

export function accountFrom(row: Row): Account {
  return {
    id: text(row, 'id'),
    sourceRef: text(row, 'source_ref'),
    source: text(row, 'source'),
    institution: text(row, 'institution'),
    name: text(row, 'name'),
    currency: currencyCode(text(row, 'currency')),
  };
}

export function transactionFrom(row: Row): Transaction {
  return {
    id: text(row, 'id'),
    accountId: text(row, 'account_id'),
    status: status(row),
    bookingDate: optionalText(row, 'booking_date'),
    valueDate: optionalText(row, 'value_date'),
    transactionDate: optionalText(row, 'transaction_date'),
    amount: money(integer(row, 'amount_minor'), text(row, 'currency')),
    counterparty: optionalText(row, 'counterparty'),
    description: text(row, 'description'),
    merchantCategoryCode: optionalText(row, 'merchant_category_code'),
  };
}

export function balanceFrom(row: Row): Balance {
  return {
    accountId: text(row, 'account_id'),
    type: text(row, 'type'),
    amount: money(integer(row, 'amount_minor'), text(row, 'currency')),
    referenceDate: optionalText(row, 'reference_date'),
  };
}

export {optionalText, text};
