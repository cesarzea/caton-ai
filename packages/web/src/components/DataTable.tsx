import type {ReactNode} from 'react';

type Props = Readonly<{
  columns: readonly string[];
  rows: readonly (readonly ReactNode[])[];
  /** Keys of the rows, stable across reloads. */
  keys: readonly string[];
}>;

/** A plain table whose first cell heads its row. */
export function DataTable({columns, rows, keys}: Props): ReactNode {
  return (
    <table className="table">
      <thead>
        <tr>
          {columns.map(column => (
            <th key={column} scope="col">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((cells, index) => (
          <tr key={keys[index]}>
            {cells.map((cell, column) =>
              column === 0 ? (
                <th key={columns[column]} scope="row">
                  {cell}
                </th>
              ) : (
                <td key={columns[column]}>{cell}</td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
