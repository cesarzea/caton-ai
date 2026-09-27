# 0015 — Email documents connector

- Status: Proposed
- Date: 2026-09-27

## Context and problem statement

Some money flows have no API. American Express Spain offers no PSD2 access (Amex exposes it only
in the United Kingdom and France) and no aggregator covers it. Other facts never reach a bank
feed at all: the service period of a subscription, the original currency of a charge, an
invoice number, a renewal that has not been charged yet. Card issuers, shops and SaaS providers
send all of this by email. ADR 0010 keeps email out of the core but allows an optional plugin.

## Decision

A connector plugin, `email-alerts`, that reads mailboxes over IMAP and turns emails into typed
financial data.

### What it reads: four kinds of document

| Kind        | Example                                 | Becomes                                                  |
| ----------- | --------------------------------------- | -------------------------------------------------------- |
| `movement`  | A card charge alert                     | A transaction on an account that has no other feed       |
| `statement` | "Your statement is ready: €1,318.01"    | A balance, and a total to reconcile against              |
| `receipt`   | An invoice or receipt from a provider   | A document matched to an existing transaction (ADR 0016) |
| `notice`    | "Your plan renews on the 15th for €180" | An expected payment, for the cash-flow forecast          |

Only `movement` creates transactions. Receipts never do: the bank already has the charge, and
creating it again would count it twice.

### Generic through recipes

- A recipe is data, not code. It sets:
  - its `kind`;
  - how to match a message: sender domain and subject pattern;
  - one capture group per field;
  - number and date formats, and direction;
  - what it misses, if anything (`partialCoverage`).
- Recipes live in a library shared by every instance: the plugin's own, the marketplace's and
  the user's. Being data, they are easy to review and safe to share.
- A chat assistant may propose a recipe from a sample email, for the user to approve. A language
  model helps write recipes; it never reads emails at sync time.
- Optional discovery lists senders whose emails carry amounts but have no recipe, from headers
  and amounts only, locally, and suggests creating one.
- Recipes over PDF attachments may follow; many invoices only come as PDF.

### Instances

The plugin is installed once and instantiated per connection. Each connection has:

- its own mailbox (any IMAP server), secret reference and folder;
- its trusted receiving server;
- the recipes it enables;
- its own sync status and interval.

A failing mailbox turns only its connection red. Account ids depend on the institution and the
account (for example the card's last digits), never on the mailbox. Several instances, or
several recipes, describing the same card therefore feed one account, and ids derived from the
`Message-ID` deduplicate the same email received twice.

### Safety

- **Read-only mailbox:** folders are opened read-only and messages fetched without setting flags.
- **Authenticity:** a message is read only if the topmost `Authentication-Results` header of
  the receiving server shows DMARC, or an aligned DKIM signature, passing for the recipe's
  domain.
- **Deterministic, bounded parsing:** regular expressions over at most 50,000 characters of
  text, obtained from HTML in linear time.
- **Fail loud:** an email that a recipe is meant for but cannot read fails its connection, with
  what is missing.
- **Credentials:** an IMAP app password, referenced as a secret and never stored in
  configuration.
- **Unattended:** a scheduler runs syncs on their own, with a minimum interval per connection
  (for example email hourly, PSD2 banks twice a day to respect their quota).

## Consequences

- American Express becomes exact in total and detailed above its alert threshold. The gap is
  computed from the statement and the repayment seen in the bank, not hidden.
- Receipts give the accrual view its service periods and expose foreign-exchange costs.
- The core needs documents and matching (ADR 0016) before receipts and notices can be stored.

## Open questions

- Whether American Express Spain sends charge alerts by email and in which format; its alert
  threshold is €50.
