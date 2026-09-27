import {describe, expect, it} from 'vitest';

import {htmlToText} from '../src/index.ts';

describe('htmlToText', () => {
  it('keeps visible text, one line per block, and decodes entities', () => {
    const html =
      '<html><head><title>x</title><style>p{}</style></head><body>' +
      '<table><tr><td>Importe:</td><td>50,00&nbsp;&euro;</td></tr>' +
      '<tr><td>Establecimiento:</td><td>A &amp; B&#39;s &#x41;</td></tr></table>' +
      '<script>alert(1)</script><p>Fin<br/>ok</p></body></html>';

    expect(htmlToText(html)).toBe("Importe: 50,00 €\nEstablecimiento: A & B's A\nFin\nok");
  });

  it('survives unclosed elements, stray brackets and unknown entities', () => {
    expect(htmlToText('a <b>bold</b> < c &bogus; <script>never closed')).toBe('a bold < c &bogus;');
    expect(htmlToText('text <unclosed')).toBe('text <unclosed');
  });

  it('handles huge bodies in linear time', () => {
    const hostile = '<script'.repeat(50_000) + '<p'.repeat(50_000);
    const started = performance.now();

    htmlToText(hostile);

    expect(performance.now() - started).toBeLessThan(1_000);
  });
});
