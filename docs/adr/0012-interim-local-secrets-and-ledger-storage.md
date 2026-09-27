# 0012 — Interim storage of local secrets and the ledger

- Status: Proposed
- Date: 2026-09-27

## Context and problem statement

The first usable version stores every transaction locally and needs credentials to reach the
bank aggregator: the Enable Banking application key and one session id per consent. ADR 0005
anticipates an encrypted secrets store, which does not exist yet.

## Current state (interim)

- `~/.config/caton-ai/config.json` holds the application id, the path to the private key and
  the session ids in plain text. The CLI **refuses to start** if the file, or the private key,
  is readable by other users.
- The ledger (`~/.local/share/caton-ai/ledger.sqlite`, or `CATON_DATA_DIR`) is created with
  owner-only permissions (0600) before any data is written, but it is **not encrypted**. Its
  confidentiality relies on file permissions and full-disk encryption (FileVault, BitLocker,
  LUKS).

## Proposed decision

- Move secrets to the OS credential store where available (macOS Keychain, Windows Credential
  Manager, Secret Service on Linux), with an encrypted file protected by a passphrase or container
  secret as the fallback.
- Encrypt the ledger at rest (for example with SQLCipher), its key held in the same credential
  store.

## Open questions

- Whether SQLCipher's native dependency is acceptable given the no-build, no-native-dependency
  goals of ADR 0003.
- How the container distribution receives secrets without an OS credential store.
