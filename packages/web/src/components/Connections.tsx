import type {ConnectionStatus} from '@caton-ai/api';
import type {ReactNode} from 'react';

import {text} from '../text.ts';

const when = (iso: string | null): string =>
  iso === null
    ? '—'
    : new Intl.DateTimeFormat(undefined, {dateStyle: 'medium', timeStyle: 'short'}).format(
        new Date(iso),
      );

function Row({connection}: Readonly<{connection: ConnectionStatus}>): ReactNode {
  return (
    <tr>
      <th scope="row">{connection.name}</th>
      <td>{connection.type}</td>
      <td>
        <span className={`badge ${connection.lastOutcome}`}>
          {text.connections.outcome[connection.lastOutcome]}
        </span>
      </td>
      <td>{when(connection.lastRunAt)}</td>
      <td className="problem">{connection.error ?? ''}</td>
    </tr>
  );
}

export function Connections({
  connections,
}: Readonly<{connections: readonly ConnectionStatus[]}>): ReactNode {
  return (
    <section className="card">
      <h2>{text.connections.title}</h2>
      {connections.length === 0 ? (
        <p className="muted">{text.connections.empty}</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              {text.connections.columns.map(column => (
                <th key={column} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {connections.map(connection => (
              <Row key={connection.name} connection={connection} />
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
