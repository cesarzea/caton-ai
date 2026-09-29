import type {ReactNode} from 'react';

import {text} from '../text.ts';

type Props = Readonly<{
  /** The connection's title, or null for every connection. */
  title: string | null;
  busy: boolean;
  onSync: () => void;
}>;

/** Starts a sync; disabled while one is running, since the server runs one at a time. */
export function SyncButton({title, busy, onSync}: Props): ReactNode {
  return (
    <button
      type="button"
      className={title === null ? 'button primary' : 'button secondary'}
      disabled={busy}
      aria-label={title === null ? text.sync.all : text.sync.one(title)}
      onClick={onSync}
    >
      {title === null ? text.sync.all : text.sync.button}
    </button>
  );
}
