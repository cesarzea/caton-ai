import {describe, expect, it} from 'vitest';

import {table, terminalOutput} from '../src/output.ts';

function stream(isTTY: boolean): NodeJS.WriteStream & {written: string} {
  const target = {
    written: '',
    isTTY,
    write(text: string): boolean {
      target.written += text;
      return true;
    },
  };
  return target as unknown as NodeJS.WriteStream & {written: string};
}

describe('table', () => {
  it('aligns columns to the widest cell', () => {
    expect(
      table([
        ['a', 'bb'],
        ['ccc', 'd'],
      ]),
    ).toEqual(['a    bb', 'ccc  d']);
  });
});

describe('terminalOutput', () => {
  it('writes lines to stdout and errors in red only on a terminal', () => {
    const stdout = stream(false);
    const tty = stream(true);
    const plain = stream(false);

    terminalOutput(stdout, tty).line('ok');
    terminalOutput(stdout, tty).error('bad');
    terminalOutput(stdout, plain).error('bad');

    expect(stdout.written).toBe('ok\n');
    expect(tty.written).toBe('\u001b[31mbad\u001b[0m\n');
    expect(plain.written).toBe('bad\n');
  });
});
