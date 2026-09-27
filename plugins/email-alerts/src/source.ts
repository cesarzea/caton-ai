import type {Account, TransactionSource} from '@caton-ai/core';

import {SOURCE_NAME, accountOf, readAlerts} from './alerts.ts';
import type {AlertsOptions, AlertsReport} from './alerts.ts';
import type {MailMessage} from './message.ts';
import type {Recipe} from './recipe.ts';

/** Where messages come from: IMAP in production, a fake in tests. */
export interface Mailbox {
  /** Messages from any of `domains` (or their subdomains) received on or after `since`. */
  messagesFrom(domains: readonly string[], since: Date): Promise<readonly MailMessage[]>;
}

export interface EmailAlertsSourceOptions extends AlertsOptions {
  readonly mailbox: Mailbox;
  readonly recipes: readonly Recipe[];
}

/** Alerts can be sent a little after the operation they describe. */
const SEARCH_MARGIN_DAYS = 3;
const DAY_MS = 86_400_000;

/**
 * Transactions read from email alerts. A message that a recipe is meant for but cannot read
 * fails the whole sync, so that a format change shows up instead of silently losing movements.
 */
export function createEmailAlertsSource(options: EmailAlertsSourceOptions): TransactionSource {
  const accounts = [
    ...new Map(
      options.recipes.map(recipe => {
        const account = accountOf(recipe, options.connection);
        return [account.id, account];
      }),
    ).values(),
  ];
  const reports = new Map<string, Promise<AlertsReport>>();
  const reportFrom = (fromDate: string): Promise<AlertsReport> => {
    const cached = reports.get(fromDate) ?? read(options, fromDate);
    reports.set(fromDate, cached);
    return cached;
  };
  return {
    name: SOURCE_NAME,
    listAccounts: () => Promise.resolve(accounts),
    listTransactions: async (account: Account, fromDate: string) =>
      (await reportFrom(fromDate)).transactions.filter(
        transaction =>
          transaction.accountId === account.id && (transaction.bookingDate ?? '') >= fromDate,
      ),
    listBalances: () => Promise.resolve([]),
  };
}

async function read(options: EmailAlertsSourceOptions, fromDate: string): Promise<AlertsReport> {
  const since = new Date(Date.parse(fromDate) - SEARCH_MARGIN_DAYS * DAY_MS);
  const domains = [...new Set(options.recipes.map(recipe => recipe.senderDomain))];
  const report = readAlerts(
    await options.mailbox.messagesFrom(domains, since),
    options.recipes,
    options,
  );
  if (report.unreadable.length > 0) {
    throw new Error(
      `${String(report.unreadable.length)} email(s) could not be read with their recipe; ` +
        `fix the recipe: ${report.unreadable.join('; ')}`,
    );
  }
  return report;
}
