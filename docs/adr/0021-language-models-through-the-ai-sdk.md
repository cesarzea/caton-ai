# 0021 — Language models through the AI SDK, with the cost of every call

- Status: Accepted
- Date: 2026-09-28
- Refines: [ADR 0009](0009-configurable-llm-provider.md) and the model port of
  [ADR 0020](0020-generic-email-connector-that-learns.md)

## Context and problem statement

The email connector needs a language model, and the user must be able to choose any provider:
a hosted API or a model on their own machine. Writing and maintaining a client per provider does
not scale. As a financial watchdog, Catón AI must also know what its own model calls cost.

Options considered:

- **One client per provider** (the first draft: the Anthropic SDK and an Ollama client). Every new
  provider is new code.
- **A proxy server such as LiteLLM.** Many providers and built-in pricing, but it is another
  process, written in Python; its spend log needs PostgreSQL; the provider keys would live in its
  configuration or in environment variables, outside the secret store of ADR 0017; and its PyPI
  package was compromised in March 2026.
- **An in-process library: the [AI SDK](https://ai-sdk.dev).** TypeScript, one call for every
  provider, structured output, token usage on every answer, released very often.

## Decision

- **The AI SDK, inside Catón AI.** One model plugin, `llm`, is configured as instances (ADR 0019):
  provider, model, API key (a secret, shareable with a macro) and, for local servers, their
  address. Providers offered: every official AI SDK provider reached with a single key (Anthropic,
  OpenAI, Google, xAI, Mistral, DeepSeek, Groq, Cerebras, Together AI, Fireworks, DeepInfra,
  Cohere, Perplexity, Moonshot, Alibaba, MiniMax and Baseten), the OpenRouter and Vercel AI
  Gateway routers, Ollama, and any OpenAI-compatible server with an optional key of its own.
  Providers that need cloud credentials rather than a key (Amazon Bedrock, Google Vertex, Azure)
  are left until they are needed. Adding one is adding its AI SDK package.
- **A language models centre in the web interface.** The configured models of every provider are
  listed apart from the connections, with what each still lacks and which connections use it.
  - A provider's API key is asked only while that provider has none. It is saved encrypted once,
    as the shared secret `<provider>-api-key`, and every model of that provider points at it.
    The contract says so with `sharedPer` on the secret; `when` shows a variable only for the
    providers it applies to, such as the address of a local server.
  - Removing a model that connections use names them before the confirming click.
- **Each connection chooses its model and its thinking effort.** A plugin declares a `model`
  variable and an `effort` variable; the web interface offers the configured models and the AI
  SDK's portable levels (`none`, `minimal`, `low`, `medium`, `high`, `xhigh`, or the provider's
  default). One model instance serves many connections, each with its own effort, bound when the
  host builds the model for that connection. For Claude Opus 5 the effort becomes adaptive
  thinking at that level, never a fixed token budget, alongside the fallback.
- **The core port stays small.** A model only extracts: instructions from the host, the text as
  data, and a JSON schema for the answer. It has no tools. Callers validate the answer.
- **Provider features are kept where they matter.** Claude Opus 5 calls ask for the server-side
  fallback Anthropic recommends (`fallbacks: 'default'`), so a classifier refusal is retried on
  another model instead of failing. A refusal that still happens is reported as such.
- **Every call reports what it consumed**, even when it fails after being billed: provider, the
  model that actually answered, input, cached and output tokens, and the cost when the provider
  reports it (OpenRouter) or 0 for a local model.
- **The host prices and records each call** in the ledger, so the spend on models shows up next
  to every other cost:
  - Prices come from [genai-prices](https://github.com/pydantic/genai-prices) (Pydantic and
    community, MIT), with price history. They are an estimate and recorded as such; the real
    figure is the provider's charge, which the bank or a receipt later confirms.
  - The price data is refreshed at most once a day during `caton sync`, from the file the
    package itself names. The download is validated against its schema and rejected when it
    would drop many models or change prices wildly; the last good copy, or the one bundled with
    the package, is used instead. The date of the prices in use is shown, in red when they are
    several days old.
  - Each recorded call keeps the cost computed at the time; later price updates never rewrite
    it.
  - A model with no known price is shown as an unknown cost, never as zero.

## Consequences

- Any provider the AI SDK reaches is one choice away, and keys stay in the encrypted store.
- The AI SDK and its provider packages are new dependencies, pinned and under the one-week
  release-age rule. The price file is data, not code, and is fetched without that delay; the
  checks above bound the harm of a bad update to wrong estimates.
- Pricing, the price refresh and the ledger records are built right after the plugin.
