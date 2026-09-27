import {LedgerUnavailableError} from '@caton-ai/ledger';
import type {LedgerReader} from '@caton-ai/ledger';

import type {ServerContext} from './context.ts';

/** An error whose message is written for the model, such as an unknown account handle. */
export class ToolError extends Error {
  override readonly name = 'ToolError';
}

/**
 * Runs `work` over a freshly opened read-only ledger and closes it. Only errors written for the
 * model pass through; anything else is logged out of band and replaced by a generic message, so
 * that paths or SQL never leak into the conversation.
 */
export function withLedger<T>(context: ServerContext, work: (ledger: LedgerReader) => T): T {
  try {
    const ledger = context.ledger();
    try {
      return work(ledger);
    } finally {
      ledger.close();
    }
  } catch (error) {
    if (error instanceof LedgerUnavailableError || error instanceof ToolError) {
      throw error;
    }
    context.logError(error);
    throw new Error('The ledger could not be read; the Catón AI server log has the details', {
      cause: error,
    });
  }
}
