# 0014 — Connector plugin contract

> Amended by [ADR 0019](0019-plugin-variables-instances-and-shared-secrets.md): plugins declare
> their variables, connections became instances, and plugin-level settings were replaced by
> shared secrets.

- Status: Proposed
- Date: 2026-09-27

## Context and problem statement

ADR 0002 makes data sources plugins, including the official ones. The first connector that is
not a bank (email alerts, ADR 0015) needs a contract that any connector can implement, and the
existing Enable Banking source has to follow it too, so that the contract is proven by real use.

## Decision

- **Location:** connector plugins live in `plugins/` of this repository, with the same quality
  gates as the core. They can move to their own repositories once the contract is versioned.
- **Contract** (`Connector` in `@caton-ai/core`):
  - a manifest: `id`, `version`, `description` and `network`, the hosts it may connect to;
  - `createSource(pluginSettings, connectionSettings, environment)`, which validates both
    settings and returns the existing `TransactionSource` port. Sync, ledger and MCP are
    unchanged.
- **Configuration:** every connection names its connector with `type`. Settings shared by all
  connections of a connector go under `plugins.<id>`.
- **Secrets:** configuration holds references, such as `file:~/.config/caton-ai/app.pem`, never
  values. The environment resolves them and refuses files that other users can read. OS
  credential stores follow ADR 0012.
- **Boundaries**, enforced by dependency-cruiser:
  - a plugin imports only the public API of `@caton-ai/core`, never the ledger or other
    packages;
  - only the command line, as composition root, loads plugins.
- **Isolation:** plugins run in the same process for now. Because they already talk to Catón AI
  only through the contract, isolating them in their own process (ADR 0006) changes the
  transport, not the plugins.
- **Failures:** a source is built inside the sync. A misconfigured connection is recorded as a
  failed sync, shown in red, and does not stop the other connections.

## Consequences

- Adding a data source means adding a plugin and a connection, without touching the core.
- The manifest's `network` list is declarative until isolation enforces it.
