import {describe, expect, it} from 'vitest';

import {newInstanceId, slug} from '../src/index.ts';

describe('instance ids', () => {
  it('come from the title, without accents or symbols', () => {
    expect(slug('Amex Catón — España')).toBe('amex-caton-espana');
    expect(slug('  Millennium BCP  ')).toBe('millennium-bcp');
    expect(slug('€€€')).toBe('instance');
  });

  it('get a number when another instance of any plugin already has them', () => {
    expect(newInstanceId('Amex', [])).toBe('amex');
    expect(newInstanceId('Amex', ['amex'])).toBe('amex-2');
    expect(newInstanceId('AMEX', ['amex', 'amex-2', 'wise'])).toBe('amex-3');
  });
});
