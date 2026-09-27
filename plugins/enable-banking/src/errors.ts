/** Base class of every error raised by the Enable Banking source. */
export class EnableBankingError extends Error {
  override readonly name: string = 'EnableBankingError';
}

/** The PSD2 consent (session) is expired or no longer authorised; the user must renew it. */
export class ConsentExpiredError extends EnableBankingError {
  override readonly name = 'ConsentExpiredError';
  readonly validUntil: string;

  constructor(validUntil: string) {
    super(`Enable Banking consent is not active (valid until ${validUntil}); renew it`);
    this.validUntil = validUntil;
  }
}

/**
 * The provider rejected the request for rate limiting. It is deliberately not retried:
 * unattended PSD2 access has a small daily quota that retries would burn.
 */
export class RateLimitedError extends EnableBankingError {
  override readonly name = 'RateLimitedError';
  readonly retryAfterSeconds: number | null;

  constructor(retryAfterSeconds: number | null) {
    super('Enable Banking rate limit reached; try again later');
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** Any other unsuccessful HTTP response. The response body is not kept: it may hold personal data. */
export class HttpError extends EnableBankingError {
  override readonly name = 'HttpError';
  readonly status: number;

  constructor(status: number, path: string) {
    super(`Enable Banking returned HTTP ${String(status)} for ${path}`);
    this.status = status;
  }
}
