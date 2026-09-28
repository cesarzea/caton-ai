import type {ConnectionStatus} from '@caton-ai/api';
import type {ReactNode} from 'react';

import type {Api} from '../api.ts';
import {text} from '../text.ts';
import {useConfiguration} from '../use-configuration.ts';
import {Instances} from './Instances.tsx';
import {Notice} from './Layout.tsx';
import {Models} from './Models.tsx';
import {SharedSecrets} from './SharedSecrets.tsx';

type Props = Readonly<{
  api: Api;
  connections: readonly ConnectionStatus[];
  syncing: readonly string[];
  onChanged: () => void;
}>;

/** The connections, the language models and the shared secrets, from one load so all agree. */
export function Configured({api, connections, syncing, onChanged}: Props): ReactNode {
  const {data, error, refresh} = useConfiguration(api);
  const changed = (): void => {
    void refresh();
    onChanged();
  };
  if (data === null) {
    return (
      <section className="card">
        <p className="muted">{text.loading}</p>
        <Notice message={error} />
      </section>
    );
  }
  return (
    <>
      <Instances
        api={api}
        data={data}
        connections={connections}
        syncing={syncing}
        onChanged={changed}
      />
      <Models api={api} data={data} onChanged={changed} />
      <SharedSecrets api={api} data={data} onChanged={changed} />
      <Notice message={error} />
    </>
  );
}
