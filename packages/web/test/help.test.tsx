import {cleanup, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';

import {Help} from '../src/components/Help.tsx';
import {inlineMarkup} from '../src/help-markup.ts';

afterEach(cleanup);

describe('Help', () => {
  it('renders paragraphs, lists, bold, code and https links', () => {
    render(
      <Help text={'First **bold** and `code`.\n\n- one [site](https://example.com/a)\n- two'} />,
    );

    expect(screen.getByText('bold').tagName).toBe('STRONG');
    expect(screen.getByText('code').tagName).toBe('CODE');
    expect(screen.getByRole('link', {name: 'site'}).getAttribute('rel')).toBe(
      'noopener noreferrer',
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('never renders HTML, and keeps other links as text', () => {
    const {container} = render(
      <Help
        text={'<img src=x onerror=alert(1)> [click](javascript:alert(1)) [x](http://plain.example)'}
      />,
    );

    expect(container.querySelector('img')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
    expect(container.textContent).toContain('[click](javascript:alert(1))');
  });
});

describe('inlineMarkup', () => {
  it('leaves unclosed or malformed markup as plain text', () => {
    expect(inlineMarkup('a ** b ` c [d](https://x y) [](https://x) *e')).toEqual([
      {kind: 'text', text: 'a ** b ` c [d](https://x y) [](https://x) *e'},
    ]);
  });

  it('scans hostile input in linear time', () => {
    const hostile = '[**`'.repeat(50_000);
    const started = performance.now();
    inlineMarkup(hostile);

    expect(performance.now() - started).toBeLessThan(2_000);
  });
});
