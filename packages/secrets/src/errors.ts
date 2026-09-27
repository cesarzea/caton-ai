/** A secret store problem. Messages never contain secret values: they end up in logs and status. */
export class SecretsError extends Error {
  override readonly name = 'SecretsError';
}
