import {createHash, randomBytes, timingSafeEqual} from 'node:crypto';

const TOKEN_LIFETIME_MS = 10 * 60_000;
const SESSION_LIFETIME_MS = 12 * 60 * 60_000;
const SESSION_COOKIE = 'caton_session';

const digest = (value: string): Buffer => createHash('sha256').update(value).digest();
const randomToken = (): string => randomBytes(32).toString('base64url');

/** Compares secrets in constant time, whatever their lengths. */
function same(left: string, right: string): boolean {
  return timingSafeEqual(digest(left), digest(right));
}

export interface Sessions {
  /** A new one-time access token, valid for ten minutes; it replaces any previous one. */
  issueToken(): string;
  /** Exchanges the access token for a session id, once. */
  exchange(token: string): string | null;
  /** Whether a `Cookie` header carries a live session. */
  isValid(cookieHeader: string | undefined): boolean;
}

function cookieValue(header: string | undefined): string | null {
  const pair = (header ?? '')
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith(`${SESSION_COOKIE}=`));
  return pair === undefined ? null : pair.slice(SESSION_COOKIE.length + 1);
}

/** Sessions live in memory only: restarting the server signs everyone out. */
export function createSessions(now: () => number = Date.now): Sessions {
  let pending: {token: string; expires: number} | null = null;
  const sessions = new Map<string, number>();
  return {
    issueToken: () => {
      const token = randomToken();
      pending = {token, expires: now() + TOKEN_LIFETIME_MS};
      return token;
    },
    exchange: token => {
      if (pending === null || pending.expires < now() || !same(token, pending.token)) {
        return null;
      }
      pending = null;
      const id = randomToken();
      sessions.set(id, now() + SESSION_LIFETIME_MS);
      return id;
    },
    isValid: header => {
      const id = cookieValue(header);
      const expires = id === null ? undefined : sessions.get(id);
      return expires !== undefined && expires > now();
    },
  };
}

export function sessionCookie(id: string): string {
  return `${SESSION_COOKIE}=${id}; HttpOnly; SameSite=Strict; Path=/`;
}
