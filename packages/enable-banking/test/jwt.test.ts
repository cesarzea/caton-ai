import {verify} from 'node:crypto';

import {describe, expect, it} from 'vitest';

import {signApplicationToken} from '../src/jwt.ts';
import {privateKeyPem, publicKey} from './fake-api.ts';

function decode(part: string): unknown {
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
}

describe('signApplicationToken', () => {
  it('produces an RS256 JWT for the application, valid for one hour', () => {
    const token = signApplicationToken('app-123', privateKeyPem, 1_790_000_000);
    const [header = '', payload = '', signature = ''] = token.split('.');

    expect(decode(header)).toEqual({typ: 'JWT', alg: 'RS256', kid: 'app-123'});
    expect(decode(payload)).toEqual({
      iss: 'enablebanking.com',
      aud: 'api.enablebanking.com',
      iat: 1_790_000_000,
      exp: 1_790_003_600,
    });
    const signed = Buffer.from(`${header}.${payload}`);
    expect(verify('sha256', signed, publicKey, Buffer.from(signature, 'base64url'))).toBe(true);
  });
});
