/**
 * Schema migrations, applied in order and tracked with `PRAGMA user_version`.
 * Never edit a released migration: append a new one.
 */
export const MIGRATIONS: readonly string[] = [
  `
  CREATE TABLE accounts (
    id          TEXT PRIMARY KEY,
    source      TEXT NOT NULL,
    source_ref  TEXT NOT NULL,
    institution TEXT NOT NULL,
    name        TEXT NOT NULL,
    currency    TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  ) STRICT;

  CREATE TABLE transactions (
    id                     TEXT PRIMARY KEY,
    account_id             TEXT NOT NULL REFERENCES accounts (id),
    status                 TEXT NOT NULL CHECK (status IN ('booked', 'pending')),
    booking_date           TEXT,
    value_date             TEXT,
    transaction_date       TEXT,
    amount_minor           INTEGER NOT NULL,
    currency               TEXT NOT NULL,
    counterparty           TEXT,
    description            TEXT NOT NULL,
    merchant_category_code TEXT,
    first_seen_at          TEXT NOT NULL,
    last_seen_at           TEXT NOT NULL
  ) STRICT;

  CREATE INDEX transactions_by_account_and_date ON transactions (account_id, booking_date);

  CREATE TABLE balances (
    account_id     TEXT NOT NULL REFERENCES accounts (id),
    type           TEXT NOT NULL,
    amount_minor   INTEGER NOT NULL,
    currency       TEXT NOT NULL,
    reference_date TEXT,
    observed_at    TEXT NOT NULL,
    PRIMARY KEY (account_id, type, observed_at)
  ) STRICT;

  CREATE TABLE sync_runs (
    id          INTEGER PRIMARY KEY,
    source      TEXT NOT NULL,
    started_at  TEXT NOT NULL,
    finished_at TEXT NOT NULL,
    outcome     TEXT NOT NULL CHECK (outcome IN ('ok', 'failed')),
    error       TEXT
  ) STRICT;
  `,
  `
  CREATE TABLE model_calls (
    id                 INTEGER PRIMARY KEY,
    at                 TEXT NOT NULL,
    connection         TEXT NOT NULL,
    model_instance     TEXT NOT NULL,
    provider           TEXT NOT NULL,
    model              TEXT NOT NULL,
    outcome            TEXT NOT NULL CHECK (outcome IN ('ok', 'failed')),
    input_tokens       INTEGER,
    cache_read_tokens  INTEGER,
    cache_write_tokens INTEGER,
    output_tokens      INTEGER,
    cost_nano_usd      INTEGER,
    cost_source        TEXT NOT NULL CHECK (cost_source IN ('reported', 'estimated', 'unknown')),
    prices_date        TEXT
  ) STRICT;

  CREATE INDEX model_calls_by_date ON model_calls (at);
  `,
  `
  CREATE TABLE documents (
    id            TEXT PRIMARY KEY,
    source        TEXT NOT NULL,
    kind          TEXT NOT NULL
      CHECK (kind IN ('charge', 'refund', 'receipt', 'renewal', 'cancellation', 'statement')),
    issuer        TEXT NOT NULL,
    amount_minor  INTEGER,
    currency      TEXT,
    issued_on     TEXT NOT NULL,
    period_start  TEXT,
    period_end    TEXT,
    due_on        TEXT,
    reference     TEXT,
    verified      INTEGER NOT NULL CHECK (verified IN (0, 1)),
    origin        TEXT NOT NULL,
    first_seen_at TEXT NOT NULL,
    last_seen_at  TEXT NOT NULL
  ) STRICT;

  CREATE INDEX documents_by_date ON documents (issued_on);

  CREATE TABLE document_links (
    document_id    TEXT PRIMARY KEY REFERENCES documents (id),
    transaction_id TEXT NOT NULL REFERENCES transactions (id),
    linked_by      TEXT NOT NULL CHECK (linked_by IN ('auto', 'user')),
    linked_at      TEXT NOT NULL
  ) STRICT;

  CREATE TABLE connector_state (
    source     TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL
  ) STRICT;
  `,
];
