import type {ReactNode} from 'react';

import type {Api} from '../api.ts';
import {text} from '../text.ts';
import type {Configuration} from '../use-instance-editor.ts';
import {AddSecret} from './AddSecret.tsx';
import {SecretRow} from './SecretRow.tsx';

type Props = Readonly<{api: Api; data: Configuration; onChanged: () => void}>;

/**
 * The secrets the user shares between connections. A connection's own secrets are kept inside
 * it and shown only in its form.
 */
export function SharedSecrets({api, data, onChanged}: Props): ReactNode {
  const shared = data.secrets.filter(entry => !entry.name.includes(':'));
  const remove = (name: string): void => {
    void api.removeSecret(name).then(onChanged);
  };
  const save = (name: string, value: string): Promise<void> =>
    api.setSecret(name, value).then(onChanged);
  return (
    <section className="card">
      <h2>{text.secrets.title}</h2>
      <p className="muted">{text.secrets.intro}</p>
      {shared.length === 0 ? (
        <p className="muted">{text.secrets.empty}</p>
      ) : (
        <ul className="secrets">
          {shared.map(entry => (
            <SecretRow key={entry.name} entry={entry} onSave={save} onRemove={remove} />
          ))}
        </ul>
      )}
      <AddSecret onSave={save} />
    </section>
  );
}
