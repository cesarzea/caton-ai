import type {ConnectionStatus} from '@caton-ai/api';
import type {ReactNode} from 'react';

import {text} from '../text.ts';
import {Outcome, Problem, RowActions} from './ConnectionCells.tsx';
import type {Actions} from './ConnectionCells.tsx';
import {SyncButton} from './SyncButton.tsx';

const when = (iso: string | null): string =>
  iso === null
    ? '—'
    : new Intl.DateTimeFormat(undefined, {dateStyle: 'medium', timeStyle: 'short'}).format(
        new Date(iso),
      );

type Editable = Readonly<{actions?: Actions; syncing?: readonly string[]}>;

function Row({
  connection,
  actions,
  syncing = [],
}: Readonly<{connection: ConnectionStatus}> & Editable): ReactNode {
  return (
    <tr>
      <th scope="row">{connection.title}</th>
      <td>{connection.plugin}</td>
      <td>
        <Outcome connection={connection} syncing={syncing.includes(connection.id)} />
      </td>
      <td>{when(connection.lastRunAt)}</td>
      <Problem connection={connection} missing={actions?.needs.get(connection.id)} />
      {actions === undefined ? null : (
        <RowActions connection={connection} actions={actions} busy={syncing.length > 0} />
      )}
    </tr>
  );
}

function Table({
  connections,
  ...editable
}: Readonly<{connections: readonly ConnectionStatus[]}> & Editable): ReactNode {
  return (
    <table className="table">
      <thead>
        <tr>
          {text.connections.columns.map(column => (
            <th key={column} scope="col">
              {column}
            </th>
          ))}
          {editable.actions === undefined ? null : (
            <th scope="col" aria-label={text.configuration.edit} />
          )}
        </tr>
      </thead>
      <tbody>
        {connections.map(connection => (
          <Row key={connection.id} connection={connection} {...editable} />
        ))}
      </tbody>
    </table>
  );
}

type Props = Readonly<{connections: readonly ConnectionStatus[]; onAdd?: () => void}> & Editable;

function Heading({connections, onAdd, actions, syncing = []}: Props): ReactNode {
  return (
    <div className="card-heading">
      <h2>{text.connections.title}</h2>
      <div className="heading-actions">
        {actions === undefined || connections.length === 0 ? null : (
          <SyncButton
            title={null}
            busy={syncing.length > 0}
            onSync={() => {
              actions.onSync(null);
            }}
          />
        )}
        {onAdd === undefined ? null : (
          <button type="button" className="button primary" onClick={onAdd}>
            {text.configuration.add}
          </button>
        )}
      </div>
    </div>
  );
}

/** The state of every connection; editable and syncable once the secret store is open. */
export function Connections(props: Props): ReactNode {
  const {connections, actions, syncing} = props;
  const editable = {
    ...(actions === undefined ? {} : {actions}),
    ...(syncing === undefined ? {} : {syncing}),
  };
  return (
    <section className="card">
      <Heading {...props} />
      {connections.length === 0 ? (
        <p className="muted">{text.connections.empty}</p>
      ) : (
        <Table connections={connections} {...editable} />
      )}
    </section>
  );
}
