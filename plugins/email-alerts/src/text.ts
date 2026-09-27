import type {MailMessage} from './message.ts';

/** Recipes never see more than this: it bounds the work of their regular expressions. */
const MAX_TEXT_LENGTH = 50_000;

const ENTITIES: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  euro: '€',
  pound: '£',
};

function decodeEntities(html: string): string {
  return html.replaceAll(/&(#x[\da-f]+|#\d+|[a-z]+);/giu, (entity, code: string) => {
    if (code.startsWith('#x') || code.startsWith('#X')) {
      return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
    }
    if (code.startsWith('#')) {
      return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
    }
    return ENTITIES[code.toLowerCase()] ?? entity;
  });
}

/** HTML beyond this is ignored, before any regular expression runs on it. */
const MAX_HTML_LENGTH = 500_000;

const INVISIBLE = ['script', 'style', 'head'];

/** Removes invisible elements with plain string search, in linear time. */
function withoutInvisible(html: string): string {
  const lower = html.toLowerCase();
  let kept = '';
  let position = 0;
  for (;;) {
    const starts = INVISIBLE.map(name => [name, lower.indexOf(`<${name}`, position)] as const);
    const next = starts.filter(([, index]) => index >= 0).sort(([, a], [, b]) => a - b)[0];
    if (next === undefined) {
      return kept + html.slice(position);
    }
    const [name, index] = next;
    const close = lower.indexOf(`</${name}`, index);
    kept += `${html.slice(position, index)} `;
    position = close < 0 ? html.length : lower.indexOf('>', close) + 1 || html.length;
  }
}

/** Collapses spaces inside each line and drops empty lines. */
function tidy(text: string): string {
  return text
    .split('\n')
    .map(line => line.split(/\s/u).filter(Boolean).join(' '))
    .filter(line => line !== '')
    .join('\n');
}

/** Elements whose end starts a new line of text. */
const BLOCKS = new Set(['br', 'p', 'div', 'tr', 'li', 'table', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

/** Replaces every tag by a space, or a line break for block ends, scanning once. */
function withoutTags(html: string): string {
  let text = '';
  let position = 0;
  for (;;) {
    const open = html.indexOf('<', position);
    const close = open < 0 ? -1 : html.indexOf('>', open);
    if (close < 0) {
      return text + html.slice(position);
    }
    const name = /^\/?([a-z\d]+)/iu.exec(html.slice(open + 1, close))?.[1]?.toLowerCase() ?? '';
    text += html.slice(position, open) + (BLOCKS.has(name) ? '\n' : ' ');
    position = close + 1;
  }
}

/** Plain text of an HTML body: invisible parts dropped, block ends turned into line breaks. */
export function htmlToText(html: string): string {
  return tidy(decodeEntities(withoutTags(withoutInvisible(html.slice(0, MAX_HTML_LENGTH)))));
}

/** The text recipes read: the plain-text part when there is one, the HTML part otherwise. */
export function bodyText(message: MailMessage): string {
  const text = message.text ?? (message.html === null ? '' : htmlToText(message.html));
  return text.slice(0, MAX_TEXT_LENGTH);
}
