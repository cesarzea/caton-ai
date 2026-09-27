# @caton-ai/email-alerts

Connector plugin that turns card alerts and receipts received by email into transactions
([ADR 0015](../../docs/adr/0015-email-alerts-connector.md)). It is built for sources without a
bank API, such as American Express Spain.

> Status: the recipe engine is ready; the IMAP mailbox and the first real recipe come next.

## Recipes

A recipe describes one kind of email. Adding a sender means adding a recipe, not code:

```json
{
  "id": "example-card-charge",
  "senderDomain": "example-card.com",
  "subject": "cargo",
  "account": {"institution": "Example Card", "name": "Gold", "currency": "EUR"},
  "direction": "out",
  "numberFormat": "comma-decimal",
  "dateFormat": "DD/MM/YYYY",
  "fields": {
    "amount": "Importe:\\s*([\\d.,]+)",
    "merchant": "Establecimiento:\\s*(.+)",
    "date": "Fecha:\\s*(\\S+)"
  },
  "partialCoverage": "charges below 50 EUR"
}
```

- Every field is a regular expression with exactly one capture group, around the value. It is
  matched, ignoring case, against the plain text of the email: the text part, or the HTML part
  converted to text.
- `date` is optional; the date the email was sent is used when it is absent. `currency` is
  optional too; it can capture a code (`USD`) or a symbol (`$`).
- `partialCoverage` says what the emails miss, so that totals are never reported as complete
  when they are not.

## Safety

- **Authenticity:** a message must come from `senderDomain` and pass DMARC, or an aligned DKIM
  signature, according to the topmost `Authentication-Results` header of the receiving server.
  Headers added further down, which a sender can forge, are ignored. Anything else is rejected.
- **No language model** reads the emails: their content is attacker-controlled.
- **Bounded work:** HTML is converted to text in linear time, and recipes see at most 50,000
  characters.
- **Fail loud:** an email that a recipe is meant for but cannot read fails the whole sync, with
  what is missing. A format change shows up in red instead of silently losing movements.
