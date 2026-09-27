# 0009 — Configurable LLM provider

- Status: Accepted
- Date: 2026-09-27

## Context and problem statement

Agents, chat and plugin review need an LLM. Sending financial data to a hosted model is a privacy
decision that belongs to the user.

## Decision outcome

The LLM provider is configurable: hosted APIs (for example Anthropic or OpenAI) or a local model
(for example through Ollama). The core exposes a single provider abstraction to the agent runtime
and to plugins that hold the corresponding permission.

### Consequences

- Good: users choose between quality and keeping data on their machine.
- Bad: prompts and agent evaluations must be tested against more than one model.
