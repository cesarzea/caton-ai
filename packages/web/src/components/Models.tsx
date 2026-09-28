import type {InstanceInfo} from '@caton-ai/api';
import type {ReactNode} from 'react';

import type {Api} from '../api.ts';
import type {Configuration} from '../configuration.ts';
import {isSecret} from '../configuration-form.ts';
import {missingByInstance} from '../needs.ts';
import {text} from '../text.ts';
import {useEditing} from '../use-editing.ts';
import {applies, modelInstances, modelUsers} from '../variables.ts';
import {InstanceEditor} from './InstanceEditor.tsx';

/** What a model is, from its plain settings, such as `anthropic · claude-opus-5`. */
function summary(data: Configuration, model: InstanceInfo): string {
  const specs = data.plugins.find(plugin => plugin.id === model.plugin)?.variables ?? [];
  return specs
    .filter(spec => !isSecret(spec) && applies(spec, model.settings, specs))
    .map(spec => model.settings[spec.key])
    .filter(value => typeof value === 'string' && value !== '')
    .join(' · ');
}

type RowProps = Readonly<{data: Configuration; model: InstanceInfo; onEdit: () => void}>;

function Row({data, model, onEdit}: RowProps): ReactNode {
  const missing = missingByInstance(data).get(model.id);
  const users = modelUsers(data, model.id);
  return (
    <tr>
      <th scope="row">{model.title}</th>
      <td>{summary(data, model)}</td>
      <td>
        <span className={missing === undefined ? 'badge ok' : 'badge failed'}>
          {missing === undefined ? text.models.ready : text.configuration.needs(missing)}
        </span>
      </td>
      <td>{users.length === 0 ? text.models.unused : users.join(', ')}</td>
      <td>
        <button
          type="button"
          className="button secondary"
          aria-label={`${text.configuration.edit} ${model.title}`}
          onClick={onEdit}
        >
          {text.configuration.edit}
        </button>
      </td>
    </tr>
  );
}

function Head(): ReactNode {
  return (
    <thead>
      <tr>
        {text.models.columns.map(column => (
          <th key={column} scope="col">
            {column}
          </th>
        ))}
        <th scope="col" aria-label={text.configuration.edit} />
      </tr>
    </thead>
  );
}

type TableProps = Readonly<{data: Configuration; onEdit: (model: InstanceInfo) => void}>;

function Table({data, onEdit}: TableProps): ReactNode {
  return (
    <table className="table">
      <Head />
      <tbody>
        {modelInstances(data).map(model => (
          <Row
            key={model.id}
            data={data}
            model={model}
            onEdit={() => {
              onEdit(model);
            }}
          />
        ))}
      </tbody>
    </table>
  );
}

type ListProps = TableProps & Readonly<{onAdd: () => void}>;

function List({data, onEdit, onAdd}: ListProps): ReactNode {
  return (
    <section className="card">
      <div className="card-heading">
        <h2>{text.models.title}</h2>
        <button type="button" className="button primary" onClick={onAdd}>
          {text.models.add}
        </button>
      </div>
      <p className="muted">{text.models.intro}</p>
      {modelInstances(data).length === 0 ? (
        <p className="muted">{text.models.empty}</p>
      ) : (
        <Table data={data} onEdit={onEdit} />
      )}
    </section>
  );
}

type Props = Readonly<{api: Api; data: Configuration; onChanged: () => void}>;

/** The language models of any provider that connections can choose, and the forms to manage them. */
export function Models({api, data, onChanged}: Props): ReactNode {
  const {editing, edit, close, saved} = useEditing(onChanged);
  if (editing === undefined) {
    return (
      <List
        data={data}
        onEdit={edit}
        onAdd={() => {
          edit(null);
        }}
      />
    );
  }
  const existing =
    editing === null ? {} : {instance: editing, usedBy: modelUsers(data, editing.id)};
  return (
    <InstanceEditor {...{api, data, ...existing}} kind="model" onSaved={saved} onCancel={close} />
  );
}
