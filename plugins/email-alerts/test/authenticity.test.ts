import {describe, expect, it} from 'vitest';

import {isAuthentic} from '../src/authenticity.ts';
import {AUTH_SERVER, PASSED, message} from './mail.ts';

const authentic = (headers: string[]): boolean =>
  isAuthentic(message({authenticationResults: headers}), 'example-card.com', AUTH_SERVER);

describe('isAuthentic', () => {
  it('accepts DMARC or an aligned DKIM signature verified by the receiving server', () => {
    expect(authentic([PASSED])).toBe(true);
    expect(authentic([`${AUTH_SERVER}; dkim=pass header.d=mail.example-card.com`])).toBe(true);
  });

  it('rejects failures, signatures from other domains and look-alike domains', () => {
    expect(
      authentic([
        `${AUTH_SERVER}; dkim=fail header.d=example-card.com; dmarc=fail header.from=example-card.com`,
      ]),
    ).toBe(false);
    expect(authentic([`${AUTH_SERVER}; dkim=pass header.d=attacker.example`])).toBe(false);
    expect(
      authentic([`${AUTH_SERVER}; dmarc=pass header.from=example-card.com.attacker.example`]),
    ).toBe(false);
    expect(authentic([`${AUTH_SERVER}; dmarc=pass header.from=notexample-card.com`])).toBe(false);
  });

  it('trusts only the topmost header of the receiving server, never forged ones below it', () => {
    const real = `${AUTH_SERVER}; dmarc=fail header.from=example-card.com`;

    expect(authentic([real, PASSED])).toBe(false);
    expect(authentic(['relay.example; dmarc=pass header.from=example-card.com'])).toBe(false);
    expect(authentic([])).toBe(false);
  });

  it('ignores comments, even nested ones holding separators', () => {
    const header = `${AUTH_SERVER}; spf=pass (a (b; dmarc=pass header.from=example-card.com) c) smtp.mailfrom=x; dkim=none`;

    expect(authentic([header])).toBe(false);
  });
});
