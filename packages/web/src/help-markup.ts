/** A piece of help text: plain text, bold, code or an https link. */
export type Inline =
  | {readonly kind: 'text' | 'bold' | 'code'; readonly text: string}
  | {readonly kind: 'link'; readonly text: string; readonly href: string};

const LINK_START = '](';

type Found = {readonly inline: Inline; readonly end: number} | null;

/** `**bold**` or `` `code` `` at `index`, when closed. */
function pairAt(source: string, index: number, mark: string, kind: 'bold' | 'code'): Found {
  const close = source.indexOf(mark, index + mark.length);
  return close > index + mark.length
    ? {inline: {kind, text: source.slice(index + mark.length, close)}, end: close + mark.length}
    : null;
}

/** `[text](https://…)` at `index`, when well formed; any other scheme stays plain text. */
function linkAt(source: string, index: number): Found {
  const middle = source.indexOf(LINK_START, index);
  const close = middle < 0 ? -1 : source.indexOf(')', middle);
  if (close < 0) {
    return null;
  }
  const text = source.slice(index + 1, middle);
  const href = source.slice(middle + LINK_START.length, close);
  const valid =
    href.startsWith('https://') && !/\s/u.test(href) && text !== '' && !text.includes(']');
  return valid ? {inline: {kind: 'link', text, href}, end: close + 1} : null;
}

/** The markup starting at `index`, if well formed, with where it ends. */
function markupAt(source: string, index: number): Found {
  switch (source.charAt(index)) {
    case '*':
      return source.startsWith('**', index) ? pairAt(source, index, '**', 'bold') : null;
    case '`':
      return pairAt(source, index, '`', 'code');
    case '[':
      return linkAt(source, index);
    default:
      return null;
  }
}

/**
 * Splits help text into pieces with a single left-to-right scan: no regular expression runs over
 * text that plugins supply. Anything malformed stays plain text.
 */
export function inlineMarkup(source: string): Inline[] {
  const pieces: Inline[] = [];
  let plain = '';
  let index = 0;
  while (index < source.length) {
    const markup = markupAt(source, index);
    if (markup === null) {
      plain += source.charAt(index);
      index += 1;
    } else {
      pieces.push(...(plain === '' ? [] : [{kind: 'text' as const, text: plain}]), markup.inline);
      plain = '';
      index = markup.end;
    }
  }
  return plain === '' ? pieces : [...pieces, {kind: 'text', text: plain}];
}
