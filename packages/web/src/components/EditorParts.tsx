import type {PluginInfo} from '@caton-ai/api';
import {useState} from 'react';
import type {ReactNode} from 'react';

import {text} from '../text.ts';
import {Help} from './Help.tsx';

type ChoiceProps = Readonly<{
  plugins: readonly PluginInfo[];
  chosen: string | undefined;
  onChoose: (id: string) => void;
}>;

export function PluginChoice({plugins, chosen, onChoose}: ChoiceProps): ReactNode {
  return (
    <fieldset className="choices">
      <legend>{text.configuration.plugin}</legend>
      {plugins.map(plugin => (
        <label key={plugin.id} className={plugin.id === chosen ? 'choice selected' : 'choice'}>
          <input
            type="radio"
            name="plugin"
            value={plugin.id}
            checked={plugin.id === chosen}
            onChange={() => {
              onChoose(plugin.id);
            }}
          />
          <span className="choice-label">{plugin.title}</span>
          <span className="choice-description">{plugin.description}</span>
        </label>
      ))}
    </fieldset>
  );
}

export function TitleField({
  value,
  onChange,
}: Readonly<{value: string; onChange: (value: string) => void}>): ReactNode {
  return (
    <div className="field variable">
      <label htmlFor="instance-title">{text.configuration.name}</label>
      <input
        id="instance-title"
        type="text"
        value={value}
        aria-describedby="instance-title-help"
        onChange={event => {
          onChange(event.target.value);
        }}
      />
      <Help id="instance-title-help" text={text.configuration.nameHelp} />
    </div>
  );
}

type ActionsProps = Readonly<{
  busy: boolean;
  canSave: boolean;
  onCancel: () => void;
  onRemove?: () => void;
}>;

/** Save, cancel and, for an existing instance, a removal that needs a confirming second click. */
export function EditorActions({busy, canSave, onCancel, onRemove}: ActionsProps): ReactNode {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="editor-actions">
      <button type="submit" className="button primary" disabled={busy || !canSave}>
        {text.configuration.save}
      </button>
      <button type="button" className="button secondary" onClick={onCancel}>
        {text.configuration.cancel}
      </button>
      {onRemove === undefined ? null : (
        <button
          type="button"
          className={confirming ? 'button danger' : 'button secondary'}
          onClick={
            confirming
              ? onRemove
              : () => {
                  setConfirming(true);
                }
          }
        >
          {confirming ? text.configuration.confirmRemove : text.configuration.remove}
        </button>
      )}
    </div>
  );
}
