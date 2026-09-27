import type {ReactNode} from 'react';

type FileProps = Readonly<{label: string; onLoad: (value: string) => void}>;

/** Multi-line secrets such as PEM keys are loaded whole: pasting into a field would lose their line breaks. */
export function FileLoader({label, onLoad}: FileProps): ReactNode {
  return (
    <label className="button secondary file-loader">
      {label}
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
