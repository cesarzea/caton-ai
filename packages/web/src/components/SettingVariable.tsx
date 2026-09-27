import type {VariableSpecInfo} from '@caton-ai/api';
import type {ReactNode} from 'react';

import {text} from '../text.ts';
import {Help} from './Help.tsx';

type Props = Readonly<{spec: VariableSpecInfo; value: string; onChange: (value: string) => void}>;

const inputId = (spec: VariableSpecInfo): string => `setting-${spec.key}`;

function ChoiceInput({spec, value, onChange}: Props): ReactNode {
  return (
    <select
      id={inputId(spec)}
      value={value}
      aria-describedby={`${inputId(spec)}-help`}
      onChange={event => {
        onChange(event.target.value);
      }}
    >
      <option value="">{text.configuration.noShared}</option>
      {(spec.choices ?? []).map(choice => (
        <option key={choice} value={choice}>
          {choice}
        </option>
      ))}
    </select>
  );
}

function TextInput({spec, value, onChange}: Props): ReactNode {
  return (
    <input
      id={inputId(spec)}
      type="text"
      inputMode={spec.kind === 'number' ? 'numeric' : 'text'}
      value={value}
      spellCheck={false}
      aria-describedby={`${inputId(spec)}-help`}
      onChange={event => {
        onChange(event.target.value);
      }}
    />
  );
}

/** A variable kept in the configuration, with the plugin's explanation of it. */
export function SettingVariable(props: Props): ReactNode {
  const {spec} = props;
  return (
    <div className="field variable">
      <label htmlFor={inputId(spec)}>
        {spec.label}
        {spec.required ? null : <span className="optional"> (optional)</span>}
      </label>
      {spec.kind === 'choice' ? <ChoiceInput {...props} /> : <TextInput {...props} />}
      {spec.kind === 'list' ? <span className="hint">{text.configuration.listHint}</span> : null}
      <Help id={`${inputId(spec)}-help`} text={spec.help} />
    </div>
  );
}
