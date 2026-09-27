import type {ReactNode} from 'react';

type FieldProps = Readonly<{
  id: string;
  label: string;
  value: string;
  type?: 'text' | 'password';
  onChange: (value: string) => void;
}>;

/** A labelled input; secrets are never autocompleted or spell-checked. */
export function Field({id, label, value, type = 'text', onChange}: FieldProps): ReactNode {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete="off"
        spellCheck={false}
        onChange={event => {
          onChange(event.target.value);
        }}
      />
    </div>
  );
}
