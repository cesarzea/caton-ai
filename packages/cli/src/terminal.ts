import {ConfigError} from './config.ts';

/** How the command line reads what must never be echoed or stored in the shell history. */
export interface TerminalInput {
  /** Reads a line typed in the terminal without echoing it; fails when there is no terminal. */
  readonly hidden: (question: string) => Promise<string>;
  /** A secret value: typed without echo in a terminal, or read from stdin when piped. */
  readonly secretValue: (question: string) => Promise<string>;
}

type Input = Pick<
  NodeJS.ReadStream,
  'isTTY' | 'setRawMode' | 'setEncoding' | 'resume' | 'pause' | 'on' | 'off'
> &
  AsyncIterable<unknown>;

const ENTER = new Set(['\r', '\n']);
const CTRL_C = '\u0003';
const BACKSPACE = new Set(['\u007f', '\b']);

/** Collects typed characters until Enter (the line) or Ctrl-C (cancelled). */
function lineCollector(done: (line: string | null) => void): (chunk: string) => void {
  let line = '';
  return chunk => {
    for (const character of chunk) {
      if (ENTER.has(character) || character === CTRL_C) {
        done(character === CTRL_C ? null : line);
        return;
      }
      line = BACKSPACE.has(character) ? line.slice(0, -1) : line + character;
    }
  };
}

function readHidden(
  input: Input,
  output: NodeJS.WritableStream,
  question: string,
): Promise<string> {
  if (!input.isTTY) {
    return Promise.reject(
      new ConfigError('A passphrase can only be typed in a terminal: the secret store is locked'),
    );
  }
  output.write(question);
  input.setRawMode(true);
  input.setEncoding('utf8');
  input.resume();
  return new Promise((resolve, reject) => {
    const onData = lineCollector(line => {
      input.setRawMode(false);
      input.pause();
      input.off('data', onData);
      output.write('\n');
      if (line === null) {
        reject(new ConfigError('Cancelled'));
      } else {
        resolve(line);
      }
    });
    input.on('data', onData);
  });
}

async function readPiped(input: AsyncIterable<unknown>): Promise<string> {
  let text = '';
  for await (const chunk of input) {
    text += String(chunk);
  }
  return text.replace(/\r?\n$/u, '');
}

export function terminalInput(input: Input, output: NodeJS.WritableStream): TerminalInput {
  const hidden = (question: string): Promise<string> => readHidden(input, output, question);
  return {
    hidden,
    secretValue: question => (input.isTTY ? hidden(question) : readPiped(input)),
  };
}
