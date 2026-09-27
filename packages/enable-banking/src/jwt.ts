import {sign} from 'node:crypto';

const TOKEN_LIFETIME_SECONDS = 3600;

function base64Url(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url');
}

/** RS256 JWT that authenticates the application against the Enable Banking API. */
export function signApplicationToken(
  appId: string,
  privateKeyPem: string,
  nowSeconds: number,
): string {
  const header = base64Url(JSON.stringify({typ: 'JWT', alg: 'RS256', kid: appId}));
  const payload = base64Url(
    JSON.stringify({
      iss: 'enablebanking.com',
      aud: 'api.enablebanking.com',
      iat: nowSeconds,
      exp: nowSeconds + TOKEN_LIFETIME_SECONDS,
    }),
  );
  const signature = sign('sha256', Buffer.from(`${header}.${payload}`), privateKeyPem);
  return `${header}.${payload}.${base64Url(signature)}`;
}
