import {render} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {UserEvent} from '@testing-library/user-event';

import {App} from '../src/App.tsx';
import type {FakeApi} from './fake-api.ts';

/** Renders the application as the one-time link would open it. */
export function openApp(
  api: FakeApi,
  token: string | null = null,
): {user: UserEvent; forgotten: () => boolean} {
  let taken = false;
  const address = {
    takeToken: () => {
      taken = true;
      return token;
    },
  };
  render(<App api={api} address={address} />);
  return {user: userEvent.setup(), forgotten: () => taken};
}
