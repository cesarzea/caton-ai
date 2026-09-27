import type {Account} from './account.ts';
import type {Balance} from './balance.ts';
import type {Transaction} from './transaction.ts';

/** Port implemented by every data source (banks, card issuers, provider usage APIs). */
export interface TransactionSource {
  readonly name: string;
  listAccounts(): Promise<readonly Account[]>;
  /** Transactions dated on or after `fromDate` (ISO `YYYY-MM-DD`), pending ones included. */
  listTransactions(account: Account, fromDate: string): Promise<readonly Transaction[]>;
  listBalances(account: Account): Promise<readonly Balance[]>;
}
