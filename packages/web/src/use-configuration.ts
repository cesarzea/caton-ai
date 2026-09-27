import {useCallback, useEffect, useState} from 'react';

import type {Api} from './api.ts';
import type {Configuration} from './use-instance-editor.ts';
import {useAction} from './use-action.ts';

/** Plugins, instances and secrets, loaded together so every panel shows the same state. */
export function useConfiguration(api: Api): {
  readonly data: Configuration | null;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
} {
  const [data, setData] = useState<Configuration | null>(null);
  const {error, run} = useAction();
  const refresh = useCallback(
    () =>
      run(async () => {
        const [plugins, instances, secrets] = await Promise.all([
          api.plugins(),
          api.instances(),
          api.secrets(),
        ]);
        setData({plugins, instances, secrets});
      }),
    [api, run],
  );
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return {data, error, refresh};
}
