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

function State({entry}: Readonly<{entry: SecretEntry | undefined}>): ReactNode {
  if (entry?.stored !== true) {
    return <span className="badge failed">{text.secrets.missing}</span>;
  }
  return (
    <span className="badge ok">
      {entry.macro === null ? text.secrets.stored : text.secrets.macro(entry.macro)}
    </span>
  );
}

function SharedPicker({
  shared,
  onChange,
}: Readonly<{shared: readonly string[]; onChange: (value: string) => void}>): ReactNode {
  return (
    <label className="shared-picker">
      {text.configuration.useShared}
      <select
        value=""
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

/** What saving will do: store a new value, or point at a shared secret. */
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

/** A secret variable: typed, loaded from a file, or pointed at a shared secret; never shown. */
export function SecretVariable({spec, entry, shared, value, onChange}: Props): ReactNode {
  const id = `secret-${spec.key}`;
  return (
    <div className="field variable">
      <label htmlFor={id}>
        {spec.label} <State entry={entry} />
      </label>
      <div className="secret-inputs">
        <input
          id={id}
          type="password"
          value={value}
          autoComplete="off"
          spellCheck={false}
          aria-describedby={`${id}-help`}
          onChange={event => {
            onChange(event.target.value);
          }}
        />
        {spec.kind === 'secret-file' ? (
          <FileLoader label={text.configuration.loadFile} onLoad={onChange} />
        ) : null}
        {shared.length === 0 ? null : <SharedPicker shared={shared} onChange={onChange} />}
      </div>
      <Pending value={value} />
      <Help id={`${id}-help`} text={spec.help} />
    </div>
  );
}
