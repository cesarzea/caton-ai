import * as z from 'zod';

// Only the fields Catón AI uses are declared; everything else in the responses is discarded.

const amount = z.object({amount: z.string(), currency: z.string()});
const party = z.object({name: z.string().nullish()}).nullish();

export const sessionSchema = z.object({
  status: z.string(),
  access: z.object({valid_until: z.string()}),
  aspsp: z.object({name: z.string()}),
  accounts: z.array(z.string()),
});

export const accountDetailsSchema = z.object({
  uid: z.string(),
  identification_hash: z.string().nullish(),
  account_id: z
    .object({
      iban: z.string().nullish(),
      other: z.object({identification: z.string()}).nullish(),
    })
    .nullish(),
  name: z.string().nullish(),
  details: z.string().nullish(),
  product: z.string().nullish(),
  currency: z.string(),
});

const transactionSchema = z.object({
  entry_reference: z.string().nullish(),
  transaction_id: z.string().nullish(),
  transaction_amount: amount,
  credit_debit_indicator: z.enum(['CRDT', 'DBIT']),
  status: z.string().nullish(),
  booking_date: z.string().nullish(),
  value_date: z.string().nullish(),
  transaction_date: z.string().nullish(),
  creditor: party,
  debtor: party,
  remittance_information: z.array(z.string()).nullish(),
  merchant_category_code: z.string().nullish(),
});

export const transactionPageSchema = z.object({
  transactions: z.array(transactionSchema),
  continuation_key: z.string().nullish(),
});

export const balancesSchema = z.object({
  balances: z.array(
    z.object({
      balance_amount: amount,
      balance_type: z.string(),
      reference_date: z.string().nullish(),
    }),
  ),
});

export type RawAccountDetails = z.infer<typeof accountDetailsSchema>;
export type RawTransaction = z.infer<typeof transactionSchema>;
export type RawBalances = z.infer<typeof balancesSchema>;
