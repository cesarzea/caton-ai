# 0017 — Secret store: age encryption, key kept where the user chooses

> Amended by [ADR 0019](0019-plugin-variables-instances-and-shared-secrets.md): secrets are keyed
> `plugin:instance:variable` or by a shared name, and configuration no longer refers to them.

- Status: Accepted
- Date: 2026-09-27
- Supersedes: the secrets part of ADR 0012

## Context and problem statement

Connectors need secrets: the Enable Banking private key and IMAP app passwords. They must be
encrypted at rest and portable across macOS, Linux, Windows and containers. They must also be
usable by syncs that run with nobody at the keyboard.

Any unattended process must be able to decrypt its secrets, so the key has to live somewhere.
There are three places for it: the operating system, a person (a passphrase) or file
permissions. No single one fits every platform and use.

## Decision

- **One encrypted store**, `secrets.age` in the configuration directory, encrypted with
  [age](https://age-encryption.org) to a single X25519 identity. The implementation is
  `age-encryption`, pure TypeScript by age's author, pinned exactly.
- **Four places for its key, chosen by the user:**
  - **Passphrase:** the identity is itself age-encrypted with a passphrase (scrypt). It is the
    most secure option. Interactive commands ask for the passphrase. Unattended runs need the
    unlock agent, which comes with the scheduler; until then, a locked store fails the
    connections that need it, in red.
  - **Key file:** the identity is in a file readable only by its owner.
  - **Container secret:** the same as a key file, with a path such as `/run/secrets/caton-key`.
  - **OS credential store:** the identity, and only the identity, lives in the macOS Keychain
    or in Secret Service on Linux.
    - It is written through stdin, never through process arguments, and the tools are called
      by absolute path.
    - Windows is refused explicitly until it can be tested.

  Changing where the key lives re-wraps the identity; the store itself is not re-encrypted.

- **References, never values, in configuration** (superseded by ADR 0019: configuration no longer
  refers to secrets at all): `age:<name>` for the store, and `file:<path>`
  for private files. Environment variables are not supported. Child processes inherit them,
  and they leak into crash dumps, logs and container inspection.
- **Commands:**
  - `caton secrets init` creates the store and never replaces an existing one;
  - `caton secrets set` takes a value typed without echo, or piped on stdin, so it never enters
    the shell history;
  - `caton secrets list` shows names only, never values;
  - `caton secrets remove` deletes a secret.
- **Files** are created with mode 0600, in a 0700 directory, and written through a temporary
  file and a rename, so a crash never leaves a partial store.
- **The store is opened once per command, and only when the configuration refers to it.**
  `caton mcp` and `caton status` never touch it.
- Error messages never contain secret values: they reach the ledger and the MCP server.

## Consequences

- Losing the key (a forgotten passphrase, a deleted key file, a wiped Keychain) loses every
  secret. The originals, such as the Enable Banking key, must then be issued again.
- JavaScript cannot wipe strings from memory, so decrypted secrets live until the process ends.
- Plugins still receive only `environment.secret(reference)`; they never see the store.
