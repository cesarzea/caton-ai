import type {ConnectionStatus} from '@caton-ai/api';
import type {ReactNode} from 'react';

import type {Api} from '../api.ts';
import {missingByInstance} from '../needs.ts';
import {useEditing} from '../use-editing.ts';
import type {Configuration} from '../configuration.ts';
import {Connections} from './Connections.tsx';
import {InstanceEditor} from './InstanceEditor.tsx';

type Props = Readonly<{
  api: Api;
  data: Configuration;
  connections: readonly ConnectionStatus[];
  onChanged: () => void;
}>;

/** Every connection with its state and what it still needs, and the forms to add or edit them. */
export function Instances({api, data, connections, onChanged}: Props): ReactNode {
  const {editing, edit, close, saved} = useEditing(onChanged);
  if (editing !== undefined) {
    const instance = editing === null ? {} : {instance: editing};
    return (
      <InstanceEditor
        {...{api, data, ...instance}}
        kind="connector"
        onSaved={saved}
        onCancel={close}
      />
    );
  }
  return (
    <Connections
      connections={connections}
      needs={missingByInstance(data)}
      onEdit={id => {
        edit(data.instances.find(candidate => candidate.id === id));
      }}
      onAdd={() => {
        edit(null);
      }}
    />
  );
}
