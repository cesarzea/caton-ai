import type {VariableSpecInfo} from '@caton-ai/api';
import {useState} from 'react';
import type {ReactNode} from 'react';

import {text} from '../text.ts';
import {Help} from './Help.tsx';

type Props = Readonly<{
  spec: VariableSpecInfo;
  /** The shared secret that keeps it, such as `anthropic-api-key`. */
  name: string;
  stored: boolean;
  value: string;
  onChange: (value: string) => void;
}>;

type InputProps = Readonly<{id: string; value: string; onChange: (value: string) => void}>;

function KeyInput({id, value, onChange}: InputProps): ReactNode {
  return (
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
  );
}

function ReplaceButton({onReplace}: Readonly<{onReplace: () => void}>): ReactNode {
  return (
    <button type="button" className="button secondary" onClick={onReplace}>
      {text.providerKey.replace}
    </button>
  );
}

/**
 * A secret kept once per provider: asked only while that provider has none, and saved encrypted
 * for every instance of the same provider. Never shown.
 */
export function ProviderKey({spec, name, stored, value, onChange}: Props): ReactNode {
  const [replacing, setReplacing] = useState(false);
  const id = `secret-${spec.key}`;
  const asking = !stored || replacing;
  return (
    <div className="field variable">
      <label htmlFor={asking ? id : undefined}>
        {spec.label}{' '}
        <span className={stored ? 'badge ok' : 'badge failed'}>
          {stored ? text.providerKey.saved(name) : text.secrets.missing}
        </span>
      </label>
      {asking ? (
        <KeyInput id={id} value={value} onChange={onChange} />
      ) : (
        <ReplaceButton
          onReplace={() => {
            setReplacing(true);
          }}
        />
      )}
      {asking ? <span className="hint">{text.providerKey.willSave(name)}</span> : null}
      <Help id={`${id}-help`} text={spec.help} />
    </div>
  );
}
