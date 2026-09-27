import {describe, expect, it} from 'vitest';

import {macOsKeychain} from '../src/keychain.ts';

describe('macOsKeychain', () => {
  it('reports a missing item without revealing anything else', () => {
    expect(() => macOsKeychain('caton-ai-test-missing', 'nobody@example.com')).toThrow(
      'No Keychain password for service "caton-ai-test-missing" and account "nobody@example.com"',
    );
  });
});
