import {MACRO} from '@caton-ai/api';
import type {SecretEntry, VariableSpecInfo} from '@caton-ai/api';
import {useState} from 'react';
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
  /** A shared secret's name, or '' for the connection's own value. */
  onPick: (name: string) => void;
}>;

/** Chooses a shared secret or the connection's own value, showing the current choice. */
function SharedPicker({shared, current, onPick}: PickerProps): ReactNode {
  return (
    <label className="shared-picker">
      {text.configuration.useShared}
      <select
        value={shared.includes(current) ? current : ''}
        onChange={event => {
          onPick(event.target.value);
        }}
      >
        <option value="">{text.configuration.ownValue}</option>
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

/** The shared secret in use: the one just picked, else the saved one unless its own value was chosen. */
function chosenShared(value: string, entry: SecretEntry | undefined, ownChosen: boolean): string {
  if (value !== '' || ownChosen) {
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

type ValueProps = Readonly<{
  spec: VariableSpecInfo;
  id: string;
  value: string;
  onChange: (value: string) => void;
}>;

/** Its own value: typed, or loaded whole from a file. */
function OwnValue({spec, id, value, onChange}: ValueProps): ReactNode {
  return (
    <>
      <SecretInput id={id} value={value} onChange={onChange} />
      {spec.kind === 'secret-file' ? (
        <FileLoader label={text.configuration.loadFile} onLoad={onChange} />
      ) : null}
    </>
  );
}

/**
 * A secret variable: its own value, typed or loaded from a file, or a shared secret; never
 * shown. While a shared secret is chosen, there is no value to type.
 */
export function SecretVariable({spec, entry, shared, value, onChange}: Props): ReactNode {
  const id = `secret-${spec.key}`;
  const [ownChosen, setOwnChosen] = useState(false);
  const current = chosenShared(value, entry, ownChosen);
  const pick = (name: string): void => {
    setOwnChosen(name === '');
    onChange(name === '' ? '' : `\${${name}}`);
  };
  return (
    <div className="field variable">
      <label htmlFor={current === '' ? id : undefined}>
        {spec.label} <State entry={entry} shared={shared} />
      </label>
      <div className="secret-inputs">
        {shared.length === 0 ? null : (
          <SharedPicker shared={shared} current={current} onPick={pick} />
        )}
        {current === '' ? <OwnValue spec={spec} id={id} value={value} onChange={onChange} /> : null}
      </div>
      <Pending value={value} />
      <Help id={`${id}-help`} text={spec.help} />
    </div>
  );
}
