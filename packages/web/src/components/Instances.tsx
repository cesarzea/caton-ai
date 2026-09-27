import type {ConnectionStatus, InstanceInfo} from '@caton-ai/api';
import {useCallback, useEffect, useState} from 'react';
import type {ReactNode} from 'react';

import type {Api} from '../api.ts';
import type {Configuration} from '../use-instance-editor.ts';
import {useAction} from '../use-action.ts';
import {Connections} from './Connections.tsx';
import {InstanceEditor} from './InstanceEditor.tsx';
import {Notice} from './Layout.tsx';

function useConfiguration(api: Api): {
  data: Configuration | null;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [data, setData] = useState<Configuration | null>(null);
  const {error, run} = useAction();
  const refresh = useCallback(
    () =>
      run(async () => {
        const [plugins, instances, secrets] = await Promise.all([
          api.plugins(),
          api.instances(),
          api.secrets(),
        ]);
        setData({plugins, instances, secrets});
      }),
    [api, run],
  );
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return {data, error, refresh};
}

/** `undefined` while the list is shown, `null` for a new instance, else the one being edited. */
type Editing = InstanceInfo | null | undefined;

type Props = Readonly<{api: Api; connections: readonly ConnectionStatus[]; onChanged: () => void}>;

/** Every connection with its state, and the forms to add or edit them. */
function useEditing(
  data: Configuration | null,
  refresh: () => Promise<void>,
  onChanged: () => void,
) {
  const [editing, setEditing] = useState<Editing>(undefined);
  const saved = (): void => {
    setEditing(undefined);
    void refresh();
    onChanged();
  };
  const edit = (id: string): void => {
    setEditing(data?.instances.find(candidate => candidate.id === id));
  };
  return {editing, setEditing, saved, edit};
}

export function Instances({api, connections, onChanged}: Props): ReactNode {
  const {data, error, refresh} = useConfiguration(api);
  const {editing, setEditing, saved, edit} = useEditing(data, refresh, onChanged);
  if (data !== null && editing !== undefined) {
    const instance = editing === null ? {} : {instance: editing};
    return (
      <InstanceEditor
        api={api}
        data={data}
        {...instance}
        onSaved={saved}
        onCancel={() => {
          setEditing(undefined);
        }}
      />
    );
  }
  return (
    <Connections
      connections={connections}
      onEdit={edit}
      onAdd={() => {
        setEditing(null);
      }}
    >
      <Notice message={error} />
    </Connections>
  );
}
