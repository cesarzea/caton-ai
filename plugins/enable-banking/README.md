# @caton-ai/enable-banking

Transaction source for European banks through [Enable Banking](https://enablebanking.com), a
licensed PSD2 account information service provider.

- Read-only: accounts, balances and transactions of an authorised session (consent).
- Stable identifiers across consent renewals; pending and booked movements; exact amounts.
- Rate limiting is never retried, to protect the small daily quota of unattended PSD2 access.

The design of this adapter was informed by the Enable Banking provider of
[bank-mcp](https://github.com/elcukro/bank-mcp) (MIT License, © 2026 bank-mcp contributors),
reviewed and rewritten for Catón AI.
