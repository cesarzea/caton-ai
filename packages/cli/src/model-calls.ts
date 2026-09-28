import {ModelError} from '@caton-ai/core';
import type {LanguageModel, ModelUsage} from '@caton-ai/core';
import type {ModelCallRecord} from '@caton-ai/ledger';

import type {PricedCost} from './prices.ts';

/** One call a connection made to its model, before pricing. */
export interface ModelCall {
  readonly connection: string;
  readonly modelInstance: string;
  readonly outcome: 'ok' | 'failed';
  readonly usage: ModelUsage;
}

export type OnModelCall = (call: ModelCall) => void;

/**
 * The model a connection receives: every call is reported with what it consumed, including
 * failed calls the provider billed anyway.
 */
export function recorded(
  model: LanguageModel,
  who: Pick<ModelCall, 'connection' | 'modelInstance'>,
  onCall: OnModelCall,
): LanguageModel {
  return {
    name: model.name,
    extract: async request => {
      try {
        const extraction = await model.extract(request);
        onCall({...who, outcome: 'ok', usage: extraction.usage});
        return extraction;
      } catch (error) {
        if (error instanceof ModelError && error.usage !== null) {
          onCall({...who, outcome: 'failed', usage: error.usage});
        }
        throw error;
      }
    },
  };
}

/** The ledger record of a call, with the cost worked out when it was made. */
export function callRecord(call: ModelCall, at: Date, cost: PricedCost): ModelCallRecord {
  const {usage} = call;
  return {
    at,
    connection: call.connection,
    modelInstance: call.modelInstance,
    provider: usage.provider,
    model: usage.model,
    outcome: call.outcome,
    inputTokens: usage.inputTokens,
    cacheReadTokens: usage.cacheReadTokens,
    cacheWriteTokens: usage.cacheWriteTokens,
    outputTokens: usage.outputTokens,
    ...cost,
  };
}
