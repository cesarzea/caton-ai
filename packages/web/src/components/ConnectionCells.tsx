import type {ConnectionStatus} from '@caton-ai/api';
import type {ReactNode} from 'react';

import {text} from '../text.ts';
import {SyncButton} from './SyncButton.tsx';

/** What the table offers once the secret store is open. */
export type Actions = Readonly<{
  onEdit: (id: string) => void;
  /** Syncs the connections named, or every one when null. */
  onSync: (ids: readonly string[] | null) => void;
  needs: ReadonlyMap<string, readonly string[]>;
}>;

export function RowActions({
  connection,
  actions,
  busy,
}: Readonly<{connection: ConnectionStatus; actions: Actions; busy: boolean}>): ReactNode {
  return (
    <td className="row-actions">
      <SyncButton
        title={connection.title}
        busy={busy}
        onSync={() => {
          actions.onSync([connection.id]);
        }}
      />
      <button
        type="button"
        className="button secondary"
        aria-label={`${text.configuration.edit} ${connection.title}`}
        onClick={() => {
          actions.onEdit(connection.id);
        }}
      >
        {text.configuration.edit}
      </button>
    </td>
  );
}

/** What stops a connection: required variables still missing, then the last sync error. */
export function Problem({
  connection,
  missing,
}: Readonly<{connection: ConnectionStatus; missing: readonly string[] | undefined}>): ReactNode {
  return (
    <td className="problem">
      {missing === undefined ? null : <strong>{text.configuration.needs(missing)}</strong>}
      {missing !== undefined && connection.error !== null ? <br /> : null}
      {connection.error ?? ''}
    </td>
  );
}

export function Outcome({
  connection,
  syncing,
}: Readonly<{connection: ConnectionStatus; syncing: boolean}>): ReactNode {
  return syncing ? (
    <span className="badge never">{text.sync.running}</span>
  ) : (
    <span className={`badge ${connection.lastOutcome}`}>
      {text.connections.outcome[connection.lastOutcome]}
    </span>
  );
}
