# 0004 — SQLite as the first storage engine

- Status: Accepted
- Date: 2026-09-27

## Context and problem statement

The core must persist every transaction, balance snapshot, usage record and exchange rate, plus
plugin-owned data. Installation must be easy and must not add services to the user's machine.

## Considered options

1. SQLite.
2. PostgreSQL.
3. Both from the start, behind a portable query builder.

## Decision outcome

Chosen option: **1, SQLite, for now**. A single file, no extra service, trivial backups, and it
fits the native and single-container distributions (ADR 0005). Plugins never write to the
database directly: every write goes through the core, which serialises them, so SQLite's
single-writer model is not a constraint.

### Consequences

- Good: zero operational overhead for individuals and developers.
- Bad: multi-user team or SMB deployments on a shared server will eventually need PostgreSQL. SQL
  should stay portable to keep that migration affordable; revisit with a new ADR when a real
  multi-user deployment is planned.
- Encryption at rest is decided separately once the ledger schema exists (storing every
  transaction makes it important).
