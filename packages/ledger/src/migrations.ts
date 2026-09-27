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
];
