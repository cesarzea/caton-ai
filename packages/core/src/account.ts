import type {CurrencyCode} from './money.ts';

/** A bank or card account as seen by Catón AI. */
export interface Account {
  /** Stable identifier that survives consent renewals; never a session-scoped provider id. */
  readonly id: string;
  /** Provider handle used to query the account within the current consent. */
  readonly sourceRef: string;
  /** Source that provides the account, e.g. "enable-banking". */
  readonly source: string;
  /** Institution holding the account, e.g. "Millennium BCP". */
  readonly institution: string;
  readonly name: string;
  readonly currency: CurrencyCode;
}
