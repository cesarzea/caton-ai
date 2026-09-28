import type {DocumentInfo} from '@caton-ai/api';
import {useState} from 'react';
import type {ReactNode} from 'react';

import {formatAmount} from '../money.ts';
import {text} from '../text.ts';
import {DataTable} from './DataTable.tsx';

type Filter = keyof typeof text.reports.filters;

const FILTERS: Readonly<Record<Filter, (document: DocumentInfo) => boolean>> = {
  all: () => true,
  'to-review': document => !document.verified,
  unlinked: document => !document.linked,
};

function FilterChoice({
  filter,
  onChoose,
}: Readonly<{filter: Filter; onChoose: (filter: Filter) => void}>): ReactNode {
  return (
    <label className="shared-picker">
      {text.reports.filter}
      <select
        value={filter}
        onChange={event => {
          onChoose(event.target.value as Filter);
        }}
      >
        {(Object.keys(FILTERS) as Filter[]).map(option => (
          <option key={option} value={option}>
            {text.reports.filters[option]}
          </option>
        ))}
      </select>
    </label>
  );
}

const words = text.reports;

/** The issuer, with where the document came from under it: both are written by third parties. */
const issuerOf = (document: DocumentInfo): ReactNode => (
  <>
    {document.issuer}
    <span className="hint">{document.origin}</span>
  </>
);

const row = (document: DocumentInfo): ReactNode[] => [
  document.issuedOn,
  document.kind,
  issuerOf(document),
  formatAmount(document.amount, document.currency),
  document.account ?? words.unknown,
  <span key="state" className={document.verified ? 'badge ok' : 'badge failed'}>
    {document.verified ? words.verified : words.toReview}
  </span>,
  document.linked ? words.linked : words.unknown,
];

/** The documents read from the connections, with their state; filtered to what needs a look. */
export function Documents({documents}: Readonly<{documents: readonly DocumentInfo[]}>): ReactNode {
  const [filter, setFilter] = useState<Filter>('all');
  const shown = documents.filter(FILTERS[filter]);
  return (
    <section className="card">
      <div className="card-heading">
        <h2>{words.documentsTitle}</h2>
        <FilterChoice filter={filter} onChoose={setFilter} />
      </div>
      <p className="muted">{words.documentsIntro}</p>
      {shown.length === 0 ? (
        <p className="muted">{words.documentsEmpty}</p>
      ) : (
        <DataTable
          columns={words.documentsColumns}
          keys={shown.map(
            (document, index) => `${document.issuedOn} ${document.origin} ${String(index)}`,
          )}
          rows={shown.map(row)}
        />
      )}
    </section>
  );
}
