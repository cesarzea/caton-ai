# 0019 — Plugin variables, instances and shared secrets

- Status: Accepted
- Date: 2026-09-27
- Amends: [ADR 0014](0014-connector-plugin-contract.md), [ADR 0017](0017-secret-store.md)

## Context and problem statement

Users configure plugins, often several times each (one instance per mailbox or per bank). They
need to know what each plugin asks for and where to get it. The same secret, such as an app
password, is often needed by several instances.

## Decision

- **Plugins declare their variables in their contract.** Each variable has:
  - a key in lowercase kebab-case, such as `imap-password`;
  - a label;
  - a kind: `text`, `number`, `choice`, `list`, `secret` or `secret-file` (loaded whole from a
    file, such as a PEM key);
  - whether it is required, and an optional default;
  - a help text saying what it is and where to obtain it, as long as needed.

  Help uses a small Markdown subset (paragraphs, lists, bold, code, https links). It is rendered
  as elements, never as HTML, because marketplace plugins will supply it.

- **Instances.** Each configured use of a plugin is an instance with an `id`, a `title`, its
  `plugin` and the values of its non-secret variables.
  - The id is made from the title the first time: accents and symbols are removed ("Amex
    Catón" → `amex-caton`), and `-2`, `-3`… are added when another instance of any plugin has
    it.
  - The id never changes afterwards: secrets and sync history hang off it, while the title can
    change.
  - The plugin-level settings of ADR 0014 are gone.
- **Secrets are identified as `plugin:instance:variable`**, for example
  `email-alerts:amex:imap-password`. They live only in the encrypted store; configuration holds
  no secret, not even a reference.
- **Shared secrets and macros.** A secret saved under a name of the user's choice, with no colon,
  is a shared secret.
  - Any variable, secret or not, can take the value `${name}` to use it. For example, two
    mailboxes of one account store `${work-imap}` as their password, instead of the password
    twice.
  - A macro is the whole value and goes one level deep: a shared secret cannot itself be a
    macro.
  - A literal value that must start with `${` is written `$${`.
  - A macro to a missing shared secret shows the instance as missing a variable.
- **The host resolves** secrets and macros before building a source: plugins receive plain
  values and never see the store. Their validation errors name variables, never values.
- **Migration:** `caton config migrate` converts the first format into instances.
  - Each connection keeps its name as id, so its history is kept.
  - Secret references are dropped and listed, to be entered in the web interface.

## Consequences

- The configuration page can be generated from the contracts, with each variable explained.
- A secret shared by several instances is stored once, and replacing it updates them all.
- Keys with colons travel URL-encoded in the local API and are decoded once, then validated.
