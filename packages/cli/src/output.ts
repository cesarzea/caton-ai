export interface Output {
  line(text: string): void;
  error(text: string): void;
}

/** Pads every column to the widest cell so the rows line up. */
export function table(rows: readonly (readonly string[])[]): string[] {
  const widths = rows.reduce<number[]>(
    (current, row) => row.map((cell, index) => Math.max(current[index] ?? 0, cell.length)),
    [],
  );
  return rows.map(row =>
    row
      .map((cell, index) => cell.padEnd(widths[index] ?? 0))
      .join('  ')
      .trimEnd(),
  );
}

export function terminalOutput(stdout: NodeJS.WriteStream, stderr: NodeJS.WriteStream): Output {
  const red = (text: string): string => (stderr.isTTY ? `\u001b[31m${text}\u001b[0m` : text);
  return {
    line: text => {
      stdout.write(`${text}\n`);
    },
    error: text => {
      stderr.write(`${red(text)}\n`);
    },
  };
}
