# 0006 — Plugin permissions and isolation

- Status: Proposed
- Date: 2026-09-27

## Context and problem statement

Plugins read the most sensitive data a person or company has and may run LLM agents. Transaction
text is attacker-controlled (anyone can send a transfer with an arbitrary reference), so prompt
injection must be assumed. Plugins will be installable from a marketplace.

## Proposed decision

- **Two plugin kinds:** agentic plugins (a Markdown prompt with YAML front matter: schedule,
  permissions) run by the core agent runtime; code plugins (TypeScript) for connectors and complex
  logic.
- **Declared permissions**, approved by the user at install time and re-approved when an update
  asks for more: for example `read:transactions`, `write:budgets`, `notify`, `network:<domains>`.
- **No network access by default.** A plugin without a network permission cannot exfiltrate data,
  even if an injected instruction tells it to.
- **Isolation:** each code plugin runs in its own process with the Node.js permission model, and
  talks to the core only through a capability SDK over JSON-RPC. It never touches the database.
- **Proposals, not writes,** for sensitive changes: the user accepts or rejects them.
- **Marketplace:** a Git-based index (no server), versions pinned by hash, signed releases, trust
  levels (official, verified, community, private), a revocation list, and open source required
  for public listing.

## Open questions

- Exact permission vocabulary and its granularity.
- Whether the Node.js permission model is sufficient, or a stronger sandbox is needed for code
  plugins.
