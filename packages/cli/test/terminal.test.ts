import {EventEmitter} from 'node:events';
import {Readable, Writable} from 'node:stream';

import {describe, expect, it} from 'vitest';

import {terminalInput} from '../src/terminal.ts';

function tty(): Readable & {isTTY: boolean; setRawMode: (raw: boolean) => void; raw: boolean[]} {
  const input = Object.assign(new Readable({read: () => undefined}), {
    isTTY: true,
    raw: [] as boolean[],
    setRawMode(raw: boolean) {
      input.raw.push(raw);
    },
  });
  return input;
}

function sink(): Writable & {text: () => string} {
  let written = '';
  return Object.assign(
    new Writable({
      write: (chunk: Buffer, _encoding, done) => {
        written += chunk.toString();
        done();
      },
    }),
    {text: () => written},
  );
}

describe('terminalInput', () => {
  it('reads without echo, handling backspace, and restores the terminal', async () => {
    const input = tty();
    const output = sink();
    const typed = terminalInput(input as never, output).hidden('Passphrase: ');
    input.emit('data', 'secrex\u007ft\r');

    expect(await typed).toBe('secret');
    expect(output.text()).toBe('Passphrase: \n');
    expect(input.raw).toEqual([true, false]);
  });

  it('cancels on Ctrl-C and refuses to prompt without a terminal', async () => {
    const input = tty();
    const cancelled = terminalInput(input as never, sink()).hidden('Passphrase: ');
    input.emit('data', 'abc\u0003');

    await expect(cancelled).rejects.toThrow('Cancelled');
    const piped = Object.assign(Readable.from([]), {isTTY: false});
    await expect(terminalInput(piped as never, sink()).hidden('Passphrase: ')).rejects.toThrow(
      /secret store is locked/u,
    );
  });

  it('reads piped secret values whole, without the final line break', async () => {
    const piped = Object.assign(Readable.from(['-----BEGIN KEY-----\n', 'abc\n']), {isTTY: false});

    expect(await terminalInput(piped as never, sink()).secretValue('Value: ')).toBe(
      '-----BEGIN KEY-----\nabc',
    );
    expect(EventEmitter.listenerCount(piped, 'data')).toBe(0);
  });
});
