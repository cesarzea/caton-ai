import * as z from 'zod';

// What the ledger shows the page: spending, documents and upcoming charges. Amounts are exact
// decimal strings with their currency, as the ledger keeps them.

const DECIMAL = z.string().regex(/^-?\d+(?:\.\d+)?$/u);
const DAY = z.string();

export const spendMonthSchema = z.object({
  month: z.string(),
  currency: z.string(),
  /** Spending known from accounts and from documents alone. */
  total: DECIMAL,
  /** The part of `total` only documents report, such as charges of a card no account reads. */
  onlyInDocuments: DECIMAL,
  /** Receipts no account shows, not in `total`: they may already be in a card's statement. */
  notSeen: DECIMAL,
});

export const spendReportSchema = z.object({
  cash: z.array(spendMonthSchema),
  accrual: z.array(spendMonthSchema),
});

export const documentInfoSchema = z.object({
  kind: z.enum(['charge', 'refund', 'receipt', 'renewal', 'cancellation', 'statement']),
  issuer: z.string(),
  amount: DECIMAL.nullable(),
  currency: z.string().nullable(),
  issuedOn: DAY,
  periodStart: DAY.nullable(),
  periodEnd: DAY.nullable(),
  dueOn: DAY.nullable(),
  reference: z.string().nullable(),
  account: z.string().nullable(),
  verified: z.boolean(),
  linked: z.boolean(),
  origin: z.string(),
});

export const documentListSchema = z.object({documents: z.array(documentInfoSchema)});

export const upcomingChargeSchema = z.object({
  issuer: z.string(),
  amount: DECIMAL.nullable(),
  currency: z.string().nullable(),
  date: DAY,
  account: z.string().nullable(),
  verified: z.boolean(),
});

export const upcomingListSchema = z.object({charges: z.array(upcomingChargeSchema)});

export type SpendReport = z.infer<typeof spendReportSchema>;
export type SpendMonth = z.infer<typeof spendMonthSchema>;
export type DocumentInfo = z.infer<typeof documentInfoSchema>;
export type DocumentList = z.infer<typeof documentListSchema>;
export type UpcomingCharge = z.infer<typeof upcomingChargeSchema>;
export type UpcomingList = z.infer<typeof upcomingListSchema>;
