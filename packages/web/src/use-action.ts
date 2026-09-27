import {useCallback, useState} from 'react';

/** Runs one user action at a time, keeping its error message for display. */
export function useAction(): {
  readonly busy: boolean;
  readonly error: string | null;
  readonly run: (action: () => Promise<void>) => Promise<void>;
  readonly fail: (message: string) => void;
} {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }, []);
  return {busy, error, run, fail: setError};
}
