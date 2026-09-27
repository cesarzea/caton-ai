import {ModelError} from '@caton-ai/core';
import {APICallError, NoObjectGeneratedError, RetryError} from 'ai';
import type {FinishReason} from 'ai';

import type {ModelSettings} from './providers.ts';
import {usageOf} from './usage.ts';

/** Why an answer that could not be read as JSON stopped. */
const ANSWER_FAILURES: Readonly<Record<FinishReason, string>> = {
  stop: 'The model answer was not valid JSON',
  length: 'The model answer was cut short',
  'content-filter': 'The model declined to read this text',
  'tool-calls': 'The model answer was not valid JSON',
  error: 'The model answer was not valid JSON',
  other: 'The model answer was not valid JSON',
};

function statusMessage(provider: string, status: number | undefined): string {
  if (status === undefined) {
    return `The ${provider} API could not be reached`;
  }
  if (status === 401 || status === 403) {
    return `The ${provider} API refused the key`;
  }
  if (status === 429) {
    return `The ${provider} API is limiting requests; try again later`;
  }
  return `The ${provider} API answered ${String(status)}`;
}

/**
 * A model failure without the text sent or the provider's answer, which may quote it. Answers
 * that were not JSON were billed, so they keep their usage.
 */
export function failure(settings: ModelSettings, error: unknown): ModelError {
  const cause = RetryError.isInstance(error) ? error.lastError : error;
  if (NoObjectGeneratedError.isInstance(cause)) {
    const usage = usageOf(settings, cause.usage, cause.response?.modelId);
    return new ModelError(ANSWER_FAILURES[cause.finishReason ?? 'other'], usage);
  }
  if (APICallError.isInstance(cause)) {
    return new ModelError(statusMessage(settings.provider, cause.statusCode));
  }
  return new ModelError(`The ${settings.provider} request failed`);
}
