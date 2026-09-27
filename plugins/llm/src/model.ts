import {ModelError} from '@caton-ai/core';
import type {Extraction, ExtractionRequest, LanguageModel} from '@caton-ai/core';
import {generateText, jsonSchema, Output} from 'ai';
import type {LanguageModel as SdkModel} from 'ai';

import {failure} from './errors.ts';
import {providerOptions, sdkModel} from './providers.ts';
import type {ModelSettings, ProviderOptions} from './providers.ts';
import {usageOf} from './usage.ts';

function ask(model: SdkModel, request: ExtractionRequest, options: ProviderOptions) {
  return generateText({
    model,
    instructions: request.instructions,
    prompt: request.content,
    output: Output.object({schema: jsonSchema({...request.schema})}),
    providerOptions: options,
  });
}

type Result = Awaited<ReturnType<typeof ask>>;

function extraction(settings: ModelSettings, result: Result): Extraction {
  const {response, providerMetadata} = result.finalStep;
  const usage = usageOf(settings, result.usage, response.modelId, providerMetadata);
  if (result.finishReason === 'content-filter') {
    throw new ModelError('The model declined to read this text', usage);
  }
  if (result.finishReason === 'length') {
    throw new ModelError('The model answer was cut short', usage);
  }
  return {value: result.output, usage};
}

/** Any provider's model, asked for JSON that matches the request's schema. */
export function languageModel(
  settings: ModelSettings,
  model: SdkModel = sdkModel(settings),
): LanguageModel {
  const options = providerOptions(settings);
  return {
    name: `${settings.provider}/${settings.model}`,
    extract: async request => {
      let result: Result;
      try {
        result = await ask(model, request, options);
      } catch (error) {
        throw failure(settings, error);
      }
      return extraction(settings, result);
    },
  };
}
