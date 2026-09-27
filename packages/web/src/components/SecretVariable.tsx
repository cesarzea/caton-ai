import {MACRO} from '@caton-ai/api';
import type {SecretEntry, VariableSpecInfo} from '@caton-ai/api';
import type {ReactNode} from 'react';

import {text} from '../text.ts';
import {FileLoader} from './FileLoader.tsx';
import {Help} from './Help.tsx';

type Props = Readonly<{
  spec: VariableSpecInfo;
  entry: SecretEntry | undefined;
  shared: readonly string[];
  value: string;
  onChange: (value: string) => void;
}>;

/** Where the value comes from: missing, the connection's own, or a shared secret. */
function State({
  entry,
  shared,
}: Readonly<{entry: SecretEntry | undefined; shared: readonly string[]}>): ReactNode {
  if (entry?.stored !== true) {
    return <span className="badge failed">{text.secrets.missing}</span>;
  }
  if (entry.macro === null) {
    return <span className="badge ok">{text.secrets.ownValue}</span>;
  }
  const available = shared.includes(entry.macro);
  return (
    <span className={available ? 'badge ok' : 'badge failed'}>
      {available ? text.secrets.macro(entry.macro) : text.secrets.macroMissing(entry.macro)}
    </span>
  );
}

type PickerProps = Readonly<{
  shared: readonly string[];
  current: string;
  onChange: (value: string) => void;
}>;

/** Chooses a shared secret, showing the one in use or the one just chosen. */
function SharedPicker({shared, current, onChange}: PickerProps): ReactNode {
  return (
    <label className="shared-picker">
      {text.configuration.useShared}
      <select
        value={shared.includes(current) ? current : ''}
        onChange={event => {
          if (event.target.value !== '') {
            onChange(`\${${event.target.value}}`);
          }
        }}
      >
        <option value="">{text.configuration.noShared}</option>
        {shared.map(name => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}

/** What saving will do: store a new value of its own, or point at a shared secret. */
function Pending({value}: Readonly<{value: string}>): ReactNode {
  if (value === '') {
    return null;
  }
  const shared = MACRO.exec(value)?.[1];
  return (
    <span className="hint">
      {shared === undefined ? text.configuration.secretReady : text.secrets.macro(shared)}
    </span>
  );
}

/** The shared secret shown as chosen: the one just picked, else the one saved. */
function chosenShared(value: string, entry: SecretEntry | undefined): string {
  if (value !== '') {
    return MACRO.exec(value)?.[1] ?? '';
  }
  return entry?.macro ?? '';
}

type InputProps = Readonly<{id: string; value: string; onChange: (value: string) => void}>;

/** Where a value is typed; a chosen shared secret is shown by the picker, not here. */
function SecretInput({id, value, onChange}: InputProps): ReactNode {
  return (
    <input
      id={id}
      type="password"
      value={MACRO.test(value) ? '' : value}
      autoComplete="off"
      spellCheck={false}
      aria-describedby={`${id}-help`}
      onChange={event => {
        onChange(event.target.value);
      }}
    />
  );
}

/** A secret variable: typed, loaded from a file, or pointed at a shared secret; never shown. */
export function SecretVariable({spec, entry, shared, value, onChange}: Props): ReactNode {
  const id = `secret-${spec.key}`;
  return (
    <div className="field variable">
      <label htmlFor={id}>
        {spec.label} <State entry={entry} shared={shared} />
      </label>
      <div className="secret-inputs">
        <SecretInput id={id} value={value} onChange={onChange} />
        {spec.kind === 'secret-file' ? (
          <FileLoader label={text.configuration.loadFile} onLoad={onChange} />
        ) : null}
        {shared.length === 0 ? null : (
          <SharedPicker shared={shared} current={chosenShared(value, entry)} onChange={onChange} />
        )}
      </div>
      <Pending value={value} />
      <Help id={`${id}-help`} text={spec.help} />
    </div>
  );
}
