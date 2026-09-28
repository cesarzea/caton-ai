import {cleanup, screen, waitFor, within} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';

import {fakeApi} from './fake-api.ts';
import {openApp} from './render.tsx';

afterEach(cleanup);

describe('syncing from the page', () => {
  it('syncs one connection or all, shows them syncing, and follows the sync to its end', async () => {
    const api = fakeApi({state: 'unlocked', keySource: 'passphrase'});
    const {user} = openApp(api);
    await user.click(await screen.findByRole('button', {name: 'Sync Amex'}));

    const row = (await screen.findByRole('rowheader', {name: 'Amex'})).closest('tr');
    expect(await within(row ?? document.body).findByText('Syncing…')).toBeDefined();
    expect(screen.getByRole('button', {name: 'Sync all'})).toHaveProperty('disabled', true);
    api.syncing = [];
    await waitFor(
      () => {
        expect(screen.getByRole('button', {name: 'Sync all'})).toHaveProperty('disabled', false);
      },
      {timeout: 3_000},
    );

    await user.click(screen.getByRole('button', {name: 'Sync all'}));
    expect(api.calls.filter(call => call[0] === 'sync')).toEqual([
      ['sync', ['amex']],
      ['sync', undefined],
    ]);
  });
});
