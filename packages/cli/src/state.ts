import type {ConnectorState} from '@caton-ai/core';

/**
 * A connection's state during one sync: it reads the saved value, and what it writes is only
 * staged, to be saved with the data it read.
 */
export function stagedState(saved: unknown): {
  readonly port: ConnectorState;
  readonly staged: () => {readonly value: unknown} | undefined;
} {
  let staged: {readonly value: unknown} | undefined;
  return {
    port: {
      read: () => (staged === undefined ? saved : staged.value),
      write: value => {
        staged = {value};
      },
    },
    staged: () => staged,
  };
}
