import type {ConnectionStatus, InstanceInfo} from '@caton-ai/api';
import {useState} from 'react';
import type {ReactNode} from 'react';

import type {Api} from '../api.ts';
import {missingByInstance} from '../needs.ts';
import type {Configuration} from '../use-instance-editor.ts';
import {Connections} from './Connections.tsx';
import {InstanceEditor} from './InstanceEditor.tsx';

/** `undefined` while the list is shown, `null` for a new instance, else the one being edited. */
type Editing = InstanceInfo | null | undefined;

type Props = Readonly<{
  api: Api;
  data: Configuration;
  connections: readonly ConnectionStatus[];
  onChanged: () => void;
}>;

/** Every connection with its state and what it still needs, and the forms to add or edit them. */
export function Instances({api, data, connections, onChanged}: Props): ReactNode {
  const [editing, setEditing] = useState<Editing>(undefined);
  const close = (): void => {
    setEditing(undefined);
  };
  if (editing !== undefined) {
    const instance = editing === null ? {} : {instance: editing};
    const saved = (): void => {
      close();
      onChanged();
    };
    return <InstanceEditor api={api} data={data} {...instance} onSaved={saved} onCancel={close} />;
  }
  const edit = (id: string): void => {
    setEditing(data.instances.find(candidate => candidate.id === id));
  };
  return (
    <Connections
      connections={connections}
      needs={missingByInstance(data)}
      onEdit={edit}
      onAdd={() => {
        setEditing(null);
      }}
    />
  );
}
