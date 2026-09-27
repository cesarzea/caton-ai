import type {ConnectionStatus} from '@caton-ai/api';
import type {ReactNode} from 'react';

import {text} from '../text.ts';

const when = (iso: string | null): string =>
  iso === null
    ? '—'
    : new Intl.DateTimeFormat(undefined, {dateStyle: 'medium', timeStyle: 'short'}).format(
        new Date(iso),
      );

type Editable = Readonly<{
  onEdit?: (id: string) => void;
  needs?: ReadonlyMap<string, readonly string[]>;
}>;

function EditButton({
  connection,
  onEdit,
}: Readonly<{connection: ConnectionStatus; onEdit: (id: string) => void}>): ReactNode {
  return (
    <td>
      <button
        type="button"
        className="button secondary"
        aria-label={`${text.configuration.edit} ${connection.title}`}
        onClick={() => {
          onEdit(connection.id);
        }}
      >
        {text.configuration.edit}
      </button>
    </td>
  );
}

/** What stops a connection: required variables still missing, then the last sync error. */
function Problem({
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

function Row({
  connection,
  onEdit,
  needs,
}: Readonly<{connection: ConnectionStatus}> & Editable): ReactNode {
  return (
    <tr>
      <th scope="row">{connection.title}</th>
      <td>{connection.plugin}</td>
      <td>
        <span className={`badge ${connection.lastOutcome}`}>
          {text.connections.outcome[connection.lastOutcome]}
        </span>
      </td>
      <td>{when(connection.lastRunAt)}</td>
      <Problem connection={connection} missing={needs?.get(connection.id)} />
      {onEdit === undefined ? null : <EditButton connection={connection} onEdit={onEdit} />}
    </tr>
  );
}

function Table({
  connections,
  onEdit,
  needs,
}: Readonly<{connections: readonly ConnectionStatus[]}> & Editable): ReactNode {
  const editable = {
    ...(onEdit === undefined ? {} : {onEdit}),
    ...(needs === undefined ? {} : {needs}),
  };
  return (
    <table className="table">
      <thead>
        <tr>
          {text.connections.columns.map(column => (
            <th key={column} scope="col">
              {column}
            </th>
          ))}
          {onEdit === undefined ? null : <th scope="col" aria-label={text.configuration.edit} />}
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

type Props = Readonly<{
  connections: readonly ConnectionStatus[];
  onAdd?: () => void;
}> &
  Editable;

/** The state of every connection; editable once the secret store is open. */
export function Connections({connections, onEdit, needs, onAdd}: Props): ReactNode {
  const editable = {
    ...(onEdit === undefined ? {} : {onEdit}),
    ...(needs === undefined ? {} : {needs}),
  };
  return (
    <section className="card">
      <div className="card-heading">
        <h2>{text.connections.title}</h2>
        {onAdd === undefined ? null : (
          <button type="button" className="button primary" onClick={onAdd}>
            {text.configuration.add}
          </button>
        )}
      </div>
      {connections.length === 0 ? (
        <p className="muted">{text.connections.empty}</p>
      ) : (
        <Table connections={connections} {...editable} />
      )}
    </section>
  );
}
