# 0013 — Read-only MCP server over the ledger

- Status: Proposed
- Date: 2026-09-27

## Context and problem statement

AI assistants (Claude, ChatGPT, IDE agents and any other MCP host) should be able to answer
questions about the user's money from the local ledger. The answer must be exact, must say when
data is incomplete, and must not turn the assistant into a way to change data, spend the PSD2
quota or leak identifiers to a hosted model.

## Decision

- **Protocol and SDK.** Target the latest MCP specification, **2026-07-28** (stateless, no
  `initialize` handshake, JSON Schema 2020-12 tool schemas), with the official TypeScript SDK
  v2 (`@modelcontextprotocol/server`), pinned exactly. Hosts that still open with a 2025-era
  `initialize` are served too (`serveStdio` default), so current desktop hosts can connect.
- **Transport: stdio only**, started by the host as `caton mcp`. A remote (HTTP) transport needs
  authentication and is out of scope until then. Stdout belongs to the protocol; diagnostics go
  to stderr (MCP logging is deprecated in 2026-07-28).
- **Read-only by construction.** The ledger is opened with SQLite `readOnly` and
  `query_only`, per tool call, and never created or migrated. Every tool is annotated
  `readOnlyHint`, `idempotentHint`, not destructive and **not open-world**: the server has no
  network access and no sync tool, so an agent cannot burn the daily PSD2 quota.
- **Exact, honest figures.** Amounts are exact decimal strings plus an ISO 4217 code, never
  floats. Every result carries a `freshness` block (`complete`, failing connections, oldest
  successful sync) so "fail loud" survives the MCP boundary. Descriptions state what a figure
  includes, for example that outflows include transfers between the user's own accounts.
- **Data minimisation.** Accounts are exposed through opaque handles (a hash of the ledger id);
  ledger ids, session references and provider identifiers never leave the machine, and
  identifiers in sync errors are masked. Lists are paged (at most 200 movements per call) with a
  total count and a `truncated` flag.
- **Untrusted text.** Server instructions and tool descriptions state that descriptions,
  counterparties and account names are third-party text to be treated as data, never as
  instructions (prompt-injection defence, OWASP LLM01).
- **Errors.** Only errors written for the model (ledger not ready, unknown account handle) reach
  the conversation; anything else is logged to stderr and replaced by a generic message.
- **Tools**, listed in this fixed order: `sync_status`, `list_accounts`, `list_transactions`,
  `monthly_outflows`, `top_counterparties`. Each declares an output schema and returns
  structured content.

## Consequences

- An assistant can answer "how much did I pay Anthropic this quarter?" with exact figures and a
  warning when a bank connection is failing.
- Free-form SQL is not offered. A read-only SQL tool over documented views, with a row cap, is a
  candidate for a separate decision.
- Registering the server in a host is a user action; the host must launch Node.js 24 or newer.
