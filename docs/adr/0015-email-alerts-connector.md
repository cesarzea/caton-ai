# 0015 — Email alerts connector

- Status: Proposed
- Date: 2026-09-27

## Context and problem statement

American Express Spain offers no PSD2 access (Amex exposes it only in the United Kingdom and
France) and no aggregator covers it, yet its charges must reach the ledger automatically. Card
issuers, shops and SaaS providers send alerts and receipts by email; ADR 0010 keeps email out of
the core but allows an optional plugin.

## Decision

A connector plugin, `email-alerts`, that reads a mailbox over IMAP and turns matching messages
into transactions.

- **Generic through recipes:** a recipe is data, not code. It says:
  - how to match a message: sender domain and subject pattern;
  - which fields to extract: amount, currency, merchant, date, card;
  - the number and date formats and the sign.

  A new sender is a new recipe. A chat assistant may later propose a recipe from a sample email,
  for the user to approve.

- **Deterministic parsing:** email bodies are attacker-controlled, so parsing uses regular
  expressions over bounded text and never a language model.
- **Read-only mailbox:** folders are opened read-only and messages fetched without setting flags.
  Nothing is marked as read, moved or deleted.
- **Authenticity:** only messages whose DKIM/DMARC result from the receiving server passes for
  the recipe's domain are accepted. Others are rejected and counted.
- **Stateless and idempotent:** every sync re-reads its window. Ids derive from the Message-ID,
  so re-syncs never duplicate. Alerts are stored as booked movements.
- **Fail loud:** a message that matches a recipe but cannot be parsed fails the connection with
  counts, so a format change turns it red. A recipe declares when its coverage is partial (for
  example alerts only above an amount), and figures from it are not reported as complete.
- **Credentials:** an IMAP app password, referenced as a secret and never stored in
  configuration.
- **Unattended:** a scheduler runs syncs on their own, with a minimum interval per connection
  (for example email hourly, PSD2 banks twice a day to respect their quota).

## Open questions

- Whether American Express Spain sends charge alerts by email and in which format; its alert
  threshold is €50.
- Reconciling alerts with the monthly card repayment seen in the bank accounts.
