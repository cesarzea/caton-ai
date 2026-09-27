/** A secret store problem. Messages never contain secret values: they end up in logs and status. */
export class SecretsError extends Error {
  override readonly name: string = 'SecretsError';
}

/** The passphrase does not open the store. */
export class WrongPassphraseError extends SecretsError {
  override readonly name = 'WrongPassphraseError';

  constructor() {
    super('Wrong passphrase for the secret store');
  }
}
