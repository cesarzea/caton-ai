# 0020 — A generic email connector that learns

- Status: Accepted
- Date: 2026-09-28
- Supersedes: the per-sender recipes and the "no language model at sync time" rule of
  [ADR 0015](0015-email-alerts-connector.md)

## Context and problem statement

Recipes written per sender do not scale. The user wants one email connector that finds
anything about money in any email: charges, refunds, receipts, invoices, renewals,
cancellations and statements, from Apple, Amex, SaaS providers or anyone else. It must
review everything since the last run.

## Decision

- **Incremental reading.**
  - Each sync reads only the emails received since the last run.
  - Per-instance state kept by the core records the folder's UIDVALIDITY and the last UID
    processed, so no email is processed twice. It is saved in the same transaction as what the
    emails produced, and never by a failed run.
  - Emails are processed in ascending UID. If the model fails midway, what was read is saved,
    the state stops at the last email processed without a gap, and the run is still marked as
    failed.
  - Messages from the mailbox's own address or domain are skipped: invoices the user sends are
    not costs.
  - The first run looks back a configurable number of days, 90 by default.
  - The mailbox stays read-only, as in ADR 0015.
- **A local pre-filter comes first.** Only authenticated senders (DKIM/DMARC) with an amount and
  currency, plus money-related words in several languages, pass. An unauthenticated email
  never reaches a model. Most email never leaves the
  machine. The number of emails sent to a model is capped per sync and reported by
  `sync_status`.
- **A language model classifies and extracts.** The kinds are: charge, refund,
  receipt/invoice, renewal, cancellation, statement, or none. The fields are: merchant, amount,
  currency, dates, service period and reference.
  - The model is configurable per instance: a local model, whose text never leaves the machine,
    or a hosted API the user consents to for that instance. Catón AI is tied to no vendor
    (ADR 0009).
  - The core runs the model and offers plugins an extraction port, so the email plugin never
    holds provider credentials and only talks to its IMAP server.
- **Containment of injected instructions.** An email can at worst produce false data, never an
  action:
  - the model has no tools;
  - its output must match a strict schema;
  - the model returns amount, date and merchant exactly as written, each must appear in the
    email, and they are parsed locally;
  - which card or account an email speaks for comes from its authenticated sender domain,
    never from what the model read.
- **Where results go** (with [ADR 0016](0016-financial-documents-and-reconciliation.md)):
  - Only a charge or refund alert for a card with no other feed, such as American Express,
    becomes a movement. The user lists those cards by the sender domain of their alerts, such
    as `americanexpress.com`.
  - A receipt paid through a bank account is matched to the bank's charge and adds its
    details; it is never counted twice.
  - Anything else is a document to review.
- **Review, then learning.**
  - Only verified items are accepted without asking: an authenticated sender, fields grounded
    in the text and, for receipts, a matching bank charge.
  - Everything else raises an alert, counted in the web interface and over MCP, and waits in a
    review list.
  - Each answer teaches:
    - accepted or corrected items become examples for that sender and are given to the model
      next time;
    - "not a cost" ignores that kind of email from that sender;
    - "trust this sender" lets its verified emails in without asking.
  - When a sender has enough consistent confirmed examples, a deterministic rule is derived
    from them with the recipe engine of ADR 0015. From then on its emails are read without a
    model: faster, cheaper and fully local.
- **Recipes leave the interface.** They become an internal, learned layer and are never
  configured by hand.

## Consequences

- One mailbox connection covers every sender, and precision grows with use.
- New building blocks, in this order:
  1. the model port with provider plugins, configured as instances with their secrets;
  2. documents and matching in the ledger (ADR 0016);
  3. the email connector, reworked for incremental reading, pre-filter, extraction and
     validation;
  4. the review list and its learning.
- Emails sent to a hosted model leave the machine. This is the user's choice per instance, and
  their count is visible.
