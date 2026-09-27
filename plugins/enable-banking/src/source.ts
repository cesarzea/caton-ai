import type {Account, TransactionSource} from '@caton-ai/core';

import {ConsentExpiredError, EnableBankingError} from './errors.ts';
import {createApiClient} from './http.ts';
import type {ApiClient, ApiClientOptions} from './http.ts';
import {toAccount, toBalances, toTransactions} from './normalize.ts';
import {
  accountDetailsSchema,
  balancesSchema,
  sessionSchema,
  transactionPageSchema,
} from './schemas.ts';
import type {RawTransaction} from './schemas.ts';

export interface EnableBankingSourceOptions extends ApiClientOptions {
  /** Authorised PSD2 session (consent) giving access to the linked accounts. */
  readonly sessionId: string;
}

const MAX_PAGES = 500;

export function createEnableBankingSource(options: EnableBankingSourceOptions): TransactionSource {
  const api = createApiClient(options);
  const now = options.now ?? (() => new Date());
  return {
    name: 'enable-banking',
    listAccounts: () => listAccounts(api, options.sessionId, now()),
    listTransactions: async (account: Account, fromDate: string) =>
      toTransactions(await fetchAllTransactions(api, account.sourceRef, fromDate), account),
    listBalances: async (account: Account) =>
      toBalances(
        balancesSchema.parse(await api.get(accountPath(account.sourceRef, 'balances'))),
        account,
      ),
  };
}

async function listAccounts(api: ApiClient, sessionId: string, now: Date): Promise<Account[]> {
  const session = sessionSchema.parse(await api.get(`/sessions/${encodeURIComponent(sessionId)}`));
  if (session.status !== 'AUTHORIZED' || new Date(session.access.valid_until) <= now) {
    throw new ConsentExpiredError(session.access.valid_until);
  }
  const accounts: Account[] = [];
  for (const uid of session.accounts) {
    const details = accountDetailsSchema.parse(await api.get(accountPath(uid, 'details')));
    accounts.push(toAccount(details, session.aspsp.name));
  }
  return accounts;
}

async function fetchAllTransactions(
  api: ApiClient,
  uid: string,
  fromDate: string,
): Promise<RawTransaction[]> {
  const transactions: RawTransaction[] = [];
  let continuationKey: string | undefined;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const query =
      continuationKey === undefined
        ? {date_from: fromDate}
        : {date_from: fromDate, continuation_key: continuationKey};
    const body = transactionPageSchema.parse(
      await api.get(accountPath(uid, 'transactions'), query),
    );
    transactions.push(...body.transactions);
    continuationKey = body.continuation_key ?? undefined;
    if (continuationKey === undefined) {
      return transactions;
    }
  }
  throw new EnableBankingError(`Transactions of account ${uid} exceed ${String(MAX_PAGES)} pages`);
}

function accountPath(uid: string, resource: string): string {
  return `/accounts/${encodeURIComponent(uid)}/${resource}`;
}
