# 0008 — Bank connectivity via the bank-mcp providers

- Status: Accepted
- Date: 2026-09-27

## Context and problem statement

Reading bank transactions in Europe requires a licensed PSD2 aggregator. Enable Banking offers a
free restricted mode for one's own accounts and covers the maintainer's banks (Millennium BCP,
Revolut, Wise). The MIT-licensed [bank-mcp](https://github.com/elcukro/bank-mcp) project already
implements Enable Banking, Plaid, Teller and Tink providers, and has been forked and reviewed.

## Decision outcome

- Reuse the **provider layer** of bank-mcp (fork: `cesarzea/bank-mcp`), with attribution.
- The ingestion engine **imports the providers directly** instead of acting as an MCP client of
  bank-mcp: the MCP tool layer adds truncation, caching and text serialisation that bulk sync does
  not need.
- Before use, the providers are hardened: stable transaction identifiers, pending/booked status and
  all dates kept, amounts as integer minor units, merchant category codes mapped, typed errors
  with retry and backoff, consent expiry handling, and no raw bank records sent to LLMs.
- Generally useful fixes are offered upstream as pull requests.

### Consequences

- Good: European and US bank coverage without rewriting provider integrations.
- Bad: the project depends on a third-party aggregator, which sees the transactions it relays.
  This trade-off is documented for users.

## Open questions

- PSD2 limits unattended access to roughly four requests per account per day; the sync schedule
  must respect it. To be verified against Enable Banking's documentation.
- American Express Spain is not available through Enable Banking.
