import * as z from 'zod';

import {DATE_FORMATS} from './date.ts';

/** Number of capture groups of a regular expression. */
function captureGroups(source: string): number {
  return (new RegExp(`${source}|`, 'u').exec('')?.length ?? 1) - 1;
}

function compiles(source: string): boolean {
  try {
    new RegExp(source, 'iu');
    return true;
  } catch {
    return false;
  }
}

const pattern = z.string().min(1).max(500).refine(compiles, 'Not a valid regular expression');

/** A pattern with exactly one capture group: the value it extracts. */
const capture = pattern.refine(
  source => !compiles(source) || captureGroups(source) === 1,
  'Must have exactly one capture group, around the value to extract',
);

export const recipeSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/u),
  /** Messages must come from this domain (or a subdomain) and be authenticated for it. */
  senderDomain: z.string().regex(/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/u),
  subject: pattern.optional(),
  account: z.object({
    institution: z.string().min(1),
    name: z.string().min(1),
    currency: z.string().regex(/^[A-Z]{3}$/u),
  }),
  /** `out` for charges, `in` for refunds and income. */
  direction: z.enum(['out', 'in']).default('out'),
  numberFormat: z.enum(['comma-decimal', 'dot-decimal']),
  dateFormat: z.enum(DATE_FORMATS),
  fields: z.object({
    amount: capture,
    merchant: capture,
    /** Operation date; the date the email was sent when absent. */
    date: capture.optional(),
    /** Currency code or symbol; the account currency when absent. */
    currency: capture.optional(),
  }),
  /** What the alerts miss (for example "charges below €50"); absent when they miss nothing. */
  partialCoverage: z.string().min(1).optional(),
});

export type Recipe = z.infer<typeof recipeSchema>;

/** First capture of `source` in `text`, trimmed, or `null` when it does not match. */
export function captured(text: string, source: string): string | null {
  return new RegExp(source, 'iu').exec(text)?.[1]?.trim() ?? null;
}
