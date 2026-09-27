import type {ReactNode} from 'react';

import {text} from '../text.ts';
import {Field} from './Field.tsx';

export type KeyMode = keyof typeof text.store.modes;

export type ModeValues = Readonly<{passphrase: string; repeat: string; path: string}>;

const MODES = Object.keys(text.store.modes) as KeyMode[];

type OptionProps = Readonly<{mode: KeyMode; selected: boolean; onChange: (mode: KeyMode) => void}>;

function ModeOption({mode, selected, onChange}: OptionProps): ReactNode {
  const [label, description] = text.store.modes[mode];
  return (
    <label className={selected ? 'choice selected' : 'choice'}>
      <input
        type="radio"
        name="key-mode"
        value={mode}
        checked={selected}
        onChange={() => {
          onChange(mode);
        }}
      />
      <span className="choice-label">{label}</span>
      <span className="choice-description">{description}</span>
    </label>
  );
}

type ChoiceProps = Readonly<{mode: KeyMode; onChange: (mode: KeyMode) => void}>;

export function KeyModeChoice({mode, onChange}: ChoiceProps): ReactNode {
  return (
    <fieldset className="choices">
      <legend className="visually-hidden">{text.store.createTitle}</legend>
      {MODES.map(candidate => (
        <ModeOption
          key={candidate}
          mode={candidate}
          selected={candidate === mode}
          onChange={onChange}
        />
      ))}
    </fieldset>
  );
}

type FieldsProps = Readonly<{
  mode: KeyMode;
  values: ModeValues;
  onChange: (values: ModeValues) => void;
}>;

function setter(values: ModeValues, onChange: FieldsProps['onChange'], key: keyof ModeValues) {
  return (value: string): void => {
    onChange({...values, [key]: value});
  };
}

function PassphraseFields({values, onChange}: Omit<FieldsProps, 'mode'>): ReactNode {
  return (
    <>
      <Field
        id="passphrase"
        label={text.store.passphrase}
        type="password"
        value={values.passphrase}
        onChange={setter(values, onChange, 'passphrase')}
      />
      <Field
        id="repeat"
        label={text.store.repeat}
        type="password"
        value={values.repeat}
        onChange={setter(values, onChange, 'repeat')}
      />
    </>
  );
}

export function ModeFields({mode, values, onChange}: FieldsProps): ReactNode {
  if (mode === 'os-store') {
    return null;
  }
  if (mode === 'file') {
    return (
      <Field
        id="key-path"
        label={text.store.keyFile}
        value={values.path}
        onChange={setter(values, onChange, 'path')}
      />
    );
  }
  return <PassphraseFields values={values} onChange={onChange} />;
}
