import type {SecretEntry} from '@caton-ai/api';
import {useState} from 'react';
import type {ReactNode} from 'react';

import {onSubmit} from '../forms.ts';
import {text} from '../text.ts';
import {useAction} from '../use-action.ts';
import type {Save} from './AddSecret.tsx';
import {Field} from './Field.tsx';
import {Notice} from './Layout.tsx';

type EditorProps = Readonly<{
  name: string;
  onSave: Save;
  onDone: () => void;
  onCancel?: () => void;
}>;

type FileProps = Readonly<{name: string; onLoad: (value: string) => void}>;

/** Multi-line secrets such as PEM keys are loaded whole from a file: pasting into a field would lose their line breaks. */
function FileLoader({name, onLoad}: FileProps): ReactNode {
  return (
    <label className="button secondary file-loader">
      {text.secrets.fromFile(name)}
      <input
        type="file"
        className="visually-hidden"
        onChange={event => {
          void event.target.files?.[0]?.text().then(onLoad);
        }}
      />
    </label>
  );
}

/** Where a value is typed or loaded: it is sent once and never shown again. */
function useValueEditor(name: string, onSave: Save, onDone: () => void) {
  const [value, setValue] = useState('');
  const {busy, error, run} = useAction();
  const save = (content: string): void => {
    void run(() => onSave(name, content).then(onDone));
  };
  return {
    value,
    setValue,
    busy,
    error,
    save,
    submit: onSubmit(() => {
      save(value);
    }),
  };
}

function ValueEditor({name, onSave, onDone, onCancel}: EditorProps): ReactNode {
  const {value, setValue, busy, error, save, submit} = useValueEditor(name, onSave, onDone);
  return (
    <form className="value-editor" onSubmit={submit} aria-busy={busy}>
      <Field
        id={`value-${name}`}
        label={text.secrets.valueOf(name)}
        type="password"
        value={value}
        onChange={setValue}
      />
      <button type="submit" className="button primary" disabled={busy || value === ''}>
        {text.secrets.saveValue}
      </button>
      <FileLoader name={name} onLoad={save} />
      {onCancel === undefined ? null : (
        <button type="button" className="button secondary" onClick={onCancel}>
          {text.secrets.cancel}
        </button>
      )}
      <Notice message={error} />
    </form>
  );
}

/** Removing takes a confirming second click that says which connections would break. */
function RemoveButton({
  entry,
  onRemove,
}: Readonly<{entry: SecretEntry; onRemove: (name: string) => void}>): ReactNode {
  const [confirming, setConfirming] = useState(false);
  const confirmLabel =
    entry.usedBy.length === 0 ? text.secrets.confirm : text.secrets.confirmUsed(entry.usedBy);
  const click = (): void => {
    if (confirming) {
      onRemove(entry.name);
    } else {
      setConfirming(true);
    }
  };
  return (
    <button
      type="button"
      className={confirming ? 'button danger' : 'button secondary'}
      onClick={click}
    >
      {confirming ? confirmLabel : text.secrets.remove}
    </button>
  );
}

type RowProps = Readonly<{entry: SecretEntry; onSave: Save; onRemove: (name: string) => void}>;

function Summary({entry}: Readonly<{entry: SecretEntry}>): ReactNode {
  return (
    <div className="secret-summary">
      <code>age:{entry.name}</code>
      <span className={entry.stored ? 'badge ok' : 'badge failed'}>
        {entry.stored ? text.secrets.stored : text.secrets.missing}
      </span>
      <span className="usage">
        {entry.usedBy.length === 0 ? text.secrets.unused : text.secrets.usedBy(entry.usedBy)}
      </span>
    </div>
  );
}

type ActionsProps = Readonly<{
  entry: SecretEntry;
  onReplace: () => void;
  onRemove: (name: string) => void;
}>;

function SecretActions({entry, onReplace, onRemove}: ActionsProps): ReactNode {
  return (
    <div className="secret-actions">
      <button type="button" className="button secondary" onClick={onReplace}>
        {text.secrets.replace}
      </button>
      <RemoveButton entry={entry} onRemove={onRemove} />
    </div>
  );
}

/** A missing secret opens with its value field; a stored one can be replaced or removed. */
export function SecretRow({entry, onSave, onRemove}: RowProps): ReactNode {
  const [editing, setEditing] = useState(!entry.stored);
  const close = (): void => {
    setEditing(false);
  };
  const cancel = entry.stored ? {onCancel: close} : {};
  return (
    <li className={entry.stored ? 'secret' : 'secret missing'}>
      <Summary entry={entry} />
      {editing ? (
        <ValueEditor name={entry.name} onSave={onSave} onDone={close} {...cancel} />
      ) : (
        <SecretActions
          entry={entry}
          onReplace={() => {
            setEditing(true);
          }}
          onRemove={onRemove}
        />
      )}
    </li>
  );
}
