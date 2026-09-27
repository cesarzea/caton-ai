# 0016 — Financial documents and reconciliation in the core

- Status: Proposed
- Date: 2026-09-27

## Context and problem statement

Transactions say that money moved, but not why or for which period. Receipts, invoices,
statements and renewal notices carry that information. They can come from email (ADR 0015), an
uploaded PDF or a provider's billing API. Whatever the source, the same questions arise:

- Which charge does this receipt belong to?
- Does a card's detail add up to its statement?
- Which payments are coming?

## Decision

The core owns documents and reconciliation. Connectors only deliver documents.

- **Documents:**
  - **Fields:** kind (`statement`, `receipt`, `notice`), issuer, amount, currency, dates
    (issue, service period, due), reference (invoice number) and tax.
  - **Identity:** a stable id from the connector, as for transactions.
  - **Storage:** the ledger stores them next to transactions and never merges them into
    transactions.
- **Matching:** a core service links a receipt to at most one transaction by amount, date
  window and counterparty. Links are explicit and reversible.
  - A charge in another currency matches its receipt through the original amount, and the
    difference is shown as the exchange cost.
  - Unmatched receipts (probably paid with an account Catón AI does not see) and unmatched
    charges (missing invoice) are reported, not guessed.
- **Reconciliation:** for accounts with statements, the core compares the statement total with
  the movements it knows and with the repayment seen in another account. The difference is
  reported as a known gap instead of silently understating spend.
- **Views:** accrual views use the service period of matched receipts. Forecasts use notices.
- **Contract:** the connector contract (ADR 0014) gains an optional way to list documents,
  alongside transactions and balances.

## Consequences

- One matching and reconciliation logic serves every document source.
- The MCP server can answer "which invoices am I missing?" and "what is due this month?".
