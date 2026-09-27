import type {SecretEntry} from '@caton-ai/api';
import {useCallback, useEffect, useState} from 'react';
import type {ReactNode} from 'react';

import type {Api} from '../api.ts';
import {text} from '../text.ts';
import {useAction} from '../use-action.ts';
import {AddSecret} from './AddSecret.tsx';
import {Notice} from './Layout.tsx';
import {SecretRow} from './SecretRow.tsx';

function useSecretList(api: Api): {
  entries: readonly SecretEntry[];
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [entries, setEntries] = useState<readonly SecretEntry[]>([]);
  const {error, run} = useAction();
  const refresh = useCallback(
    () =>
      run(async () => {
        setEntries(await api.secrets());
      }),
    [api, run],
  );
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return {entries, error, refresh};
}

/** Every secret the configuration needs, missing ones first, and any other stored secret. */
export function Secrets({api}: Readonly<{api: Api}>): ReactNode {
  const {entries, error, refresh} = useSecretList(api);
  const remove = (name: string): void => {
    void api.removeSecret(name).then(refresh);
  };
  const save = (name: string, value: string): Promise<void> =>
    api.setSecret(name, value).then(refresh);
  return (
    <section className="card">
      <h2>{text.secrets.title}</h2>
      <p className="muted">{text.secrets.intro}</p>
      {entries.length === 0 ? (
        <p className="muted">{text.secrets.empty}</p>
      ) : (
        <ul className="secrets">
          {entries.map(entry => (
            <SecretRow key={entry.name} entry={entry} onSave={save} onRemove={remove} />
          ))}
        </ul>
      )}
      <Notice message={error} />
      <AddSecret onSave={save} />
    </section>
  );
}
