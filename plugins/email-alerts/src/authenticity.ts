import type {MailMessage} from './message.ts';

/** `domain` itself or one of its subdomains, compared case-insensitively. */
export function belongsTo(candidate: string, domain: string): boolean {
  const host = candidate.toLowerCase().replace(/^@/u, '');
  const expected = domain.toLowerCase();
  return host === expected || host.endsWith(`.${expected}`);
}

/** The header without its parenthesised comments, which may nest (RFC 5322). */
function withoutComments(header: string): string {
  let depth = 0;
  let kept = '';
  for (const character of header) {
    if (character === '(') {
      depth += 1;
    } else if (character === ')' && depth > 0) {
      depth -= 1;
    } else if (depth === 0) {
      kept += character;
    }
  }
  return kept;
}

function passesFor(result: string, domain: string): boolean {
  if (result.startsWith('dmarc=pass')) {
    const from = /\bheader\.from=(\S+)/u.exec(result)?.[1];
    return from !== undefined && belongsTo(from, domain);
  }
  if (result.startsWith('dkim=pass')) {
    const signer = /\bheader\.(?:d=|i=@?)(\S+)/u.exec(result)?.[1];
    return signer !== undefined && belongsTo(signer, domain);
  }
  return false;
}

/**
 * Whether the receiving server `authServer` (for example `mx.google.com`) verified that the
 * message really comes from `domain`: DMARC or an aligned DKIM signature passed. Only the
 * topmost header added by that server counts, because a sender can forge headers below it.
 */
export function isAuthentic(message: MailMessage, domain: string, authServer: string): boolean {
  const header = message.authenticationResults.find(
    candidate => candidate.split(';')[0]?.trim().toLowerCase() === authServer.toLowerCase(),
  );
  if (header === undefined) {
    return false;
  }
  const results = withoutComments(header)
    .split(';')
    .slice(1)
    .map(result => result.trim().toLowerCase());
  return results.some(result => passesFor(result, domain));
}
