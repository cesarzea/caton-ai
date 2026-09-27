# 0010 — No email ingestion in the core

- Status: Accepted
- Date: 2026-09-27

## Context and problem statement

Receipts and invoices arriving by email add detail (service periods, line items) and can cover
payment methods without bank access. However, most users do not want their mailbox connected, and
email parsing is fragile.

## Decision outcome

Email ingestion is not part of the core. If needed, it can be implemented as an optional plugin
(for example an IMAP source with app passwords) under the same permission model as any other
plugin.

### Consequences

- Good: a smaller core and a smaller privacy surface.
- Bad: payment methods not covered by bank aggregation (for example American Express Spain) need
  another source.
