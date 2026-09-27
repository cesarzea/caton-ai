/** A JSON Schema (draft 2020-12) object that a model's answer must match. */
export type JsonSchema = Readonly<Record<string, unknown>>;

/** Turns untrusted text into data: `instructions` are the host's, `content` is data only. */
export interface ExtractionRequest {
  readonly instructions: string;
  readonly content: string;
  readonly schema: JsonSchema;
}

/** What one model call consumed, for the host to price and record. */
export interface ModelUsage {
  /** Who served the call, such as `anthropic` or `openrouter`. */
  readonly provider: string;
  /** The model that answered, which may differ from the one asked when a fallback ran. */
  readonly model: string;
  readonly inputTokens: number | null;
  readonly cacheReadTokens: number | null;
  readonly cacheWriteTokens: number | null;
  readonly outputTokens: number | null;
  /** The cost in US dollars when the provider reports it (OpenRouter), or 0 for local models. */
  readonly reportedCostUsd: number | null;
}

export interface Extraction {
  /** The model's answer, parsed from JSON; callers validate it against the schema. */
  readonly value: unknown;
  readonly usage: ModelUsage;
}

/**
 * A failed model call, described without the text that was sent. It keeps the usage when the
 * provider billed the call anyway, such as an answer that did not match the schema.
 */
export class ModelError extends Error {
  override readonly name = 'ModelError';
  readonly usage: ModelUsage | null;

  constructor(message: string, usage: ModelUsage | null = null) {
    super(message);
    this.usage = usage;
  }
}

/**
 * A language model as plugins reach it through the host. It only extracts data: it has no tools,
 * so text trying to instruct it can at worst produce wrong data, which callers validate.
 */
export interface LanguageModel {
  /** What the model is, such as `anthropic/claude-opus-5`, for status and logs. */
  readonly name: string;
  extract(request: ExtractionRequest): Promise<Extraction>;
}
