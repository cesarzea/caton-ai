import {REASONING_EFFORTS} from '@caton-ai/api';
import type {InstanceInfo, VariableSpecInfo} from '@caton-ai/api';
import type {ReactNode} from 'react';

import {text} from '../text.ts';
import {Help} from './Help.tsx';

type Props = Readonly<{spec: VariableSpecInfo; value: string; onChange: (value: string) => void}>;

function Labelled({
  spec,
  children,
}: Readonly<{spec: VariableSpecInfo; children: ReactNode}>): ReactNode {
  const id = `setting-${spec.key}`;
  return (
    <div className="field variable">
      <label htmlFor={id}>
        {spec.label}
        {spec.required ? null : <span className="optional"> (optional)</span>}
      </label>
      {children}
      <Help id={`${id}-help`} text={spec.help} />
    </div>
  );
}

/** Which configured language model the plugin uses. */
export function ModelVariable({
  spec,
  value,
  onChange,
  models,
}: Props & Readonly<{models: readonly InstanceInfo[]}>): ReactNode {
  const id = `setting-${spec.key}`;
  return (
    <Labelled spec={spec}>
      {models.length === 0 ? <span className="hint">{text.models.none}</span> : null}
      <select
        id={id}
        value={value}
        aria-describedby={`${id}-help`}
        onChange={event => {
          onChange(event.target.value);
        }}
      >
        <option value="">{text.models.choose}</option>
        {models.map(model => (
          <option key={model.id} value={model.id}>
            {model.title}
          </option>
        ))}
      </select>
    </Labelled>
  );
}

/** How much that model reasons for this plugin; unset leaves it to the provider. */
export function EffortVariable({spec, value, onChange}: Props): ReactNode {
  const id = `setting-${spec.key}`;
  return (
    <Labelled spec={spec}>
      <select
        id={id}
        value={value === 'provider-default' ? '' : value}
        aria-describedby={`${id}-help`}
        onChange={event => {
          onChange(event.target.value);
        }}
      >
        {REASONING_EFFORTS.map(effort => (
          <option key={effort} value={effort === 'provider-default' ? '' : effort}>
            {text.effort[effort]}
          </option>
        ))}
      </select>
    </Labelled>
  );
}
