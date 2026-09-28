import type {InstanceInfo} from '@caton-ai/api';
import {useState} from 'react';

/** `undefined` while the list is shown, `null` for a new instance, else the one being edited. */
type Editing = InstanceInfo | null | undefined;

/** Which instance a panel is editing, and how its editor closes. */
export function useEditing(onChanged: () => void): {
  readonly editing: Editing;
  readonly edit: (instance: InstanceInfo | null | undefined) => void;
  readonly close: () => void;
  readonly saved: () => void;
} {
  const [editing, setEditing] = useState<Editing>(undefined);
  const close = (): void => {
    setEditing(undefined);
  };
  return {
    editing,
    edit: setEditing,
    close,
    saved: () => {
      close();
      onChanged();
    },
  };
}
