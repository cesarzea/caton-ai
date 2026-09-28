import type {ConnectionStatus} from '@caton-ai/api';
import type {ReactNode} from 'react';

import type {Api} from '../api.ts';
import {missingByInstance} from '../needs.ts';
import {useEditing} from '../use-editing.ts';
import type {Configuration} from '../configuration.ts';
import {useAction} from '../use-action.ts';
import {Connections} from './Connections.tsx';
import {InstanceEditor} from './InstanceEditor.tsx';
import {Notice} from './Layout.tsx';

type Props = Readonly<{
  api: Api;
  data: Configuration;
  connections: readonly ConnectionStatus[];
  syncing: readonly string[];
  onChanged: () => void;
}>;

type Editing = ReturnType<typeof useEditing>;

/** What the connections table can do: edit a connection, or sync some or all. */
function actionsOf(
  {api, data, onChanged}: Props,
  edit: Editing['edit'],
  run: ReturnType<typeof useAction>['run'],
) {
  return {
    needs: missingByInstance(data),
    onEdit: (id: string) => {
      edit(data.instances.find(candidate => candidate.id === id));
    },
    onSync: (ids: readonly string[] | null) => {
      void run(() => api.sync(ids ?? undefined).then(onChanged));
    },
  };
}

/** Every connection with its state and what it still needs, and the forms to add, edit or sync them. */
export function Instances(props: Props): ReactNode {
  const {api, data, connections, syncing, onChanged} = props;
  const {editing, edit, close, saved} = useEditing(onChanged);
  const {error, run} = useAction();
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
    <>
      <Connections
        connections={connections}
        syncing={syncing}
        actions={actionsOf(props, edit, run)}
        onAdd={() => {
          edit(null);
        }}
      />
      <Notice message={error} />
    </>
  );
}
