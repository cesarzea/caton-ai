import {cleanup, screen} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';

import {validated} from '../src/components/CreateStore.tsx';
import {fakeApi} from './fake-api.ts';
import {openApp} from './render.tsx';

afterEach(cleanup);

describe('creating the store', () => {
  it('checks the passphrase before sending it, then opens the secrets', async () => {
    const api = fakeApi();
    const {user} = openApp(api);
    await user.type(await screen.findByLabelText('Passphrase'), 'short');
    await user.click(screen.getByRole('button', {name: 'Create the store'}));
    expect(screen.getByRole('alert').textContent).toBe('Use at least 12 characters.');

    await user.type(screen.getByLabelText('Passphrase'), ' but now long');
    await user.type(screen.getByLabelText('Repeat the passphrase'), 'short but now long');
    await user.click(screen.getByRole('button', {name: 'Create the store'}));

    expect(await screen.findByRole('heading', {name: 'Secrets'})).toBeDefined();
    expect(api.calls).toEqual([
      ['initStore', {source: 'passphrase', passphrase: 'short but now long'}],
    ]);
  });
});

describe('creating the store without a passphrase', () => {
  it('offers a key file or the operating system instead', async () => {
    const api = fakeApi();
    const {user} = openApp(api);
    await user.click(await screen.findByRole('radio', {name: /Key file/u}));
    await user.type(
      screen.getByLabelText('Absolute path of the key file'),
      ' /run/secrets/caton-key ',
    );
    await user.click(screen.getByRole('button', {name: 'Create the store'}));

    expect(api.calls).toEqual([['initStore', {source: 'file', path: '/run/secrets/caton-key'}]]);
    expect(validated('os-store', {passphrase: '', repeat: '', path: ''})).toEqual({
      request: {source: 'os-store'},
    });
    expect(
      validated('passphrase', {passphrase: 'long enough one', repeat: 'different', path: ''}),
    ).toEqual({problem: 'The passphrases do not match.'});
  });
});

describe('unlocking the store', () => {
  it('shows a wrong passphrase, then opens with the right one', async () => {
    const api = fakeApi({state: 'locked', keySource: 'passphrase'});
    const {user} = openApp(api);
    await user.type(await screen.findByLabelText('Passphrase'), 'guess');
    await user.click(screen.getByRole('button', {name: 'Unlock'}));
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Wrong passphrase for the secret store',
    );

    await user.clear(screen.getByLabelText('Passphrase'));
    await user.type(screen.getByLabelText('Passphrase'), 'correct passphrase');
    await user.click(screen.getByRole('button', {name: 'Unlock'}));
    expect(await screen.findByRole('heading', {name: 'Secrets'})).toBeDefined();
  });

  it('says why a key file did not open the store, and locks again on request', async () => {
    openApp(fakeApi({state: 'locked', keySource: 'file', error: '/keys/caton does not exist'}));
    expect((await screen.findByRole('alert')).textContent).toBe(
      'The store could not open by itself: /keys/caton does not exist',
    );
    cleanup();

    const api = fakeApi({state: 'unlocked', keySource: 'passphrase'});
    const {user} = openApp(api);
    await user.click(await screen.findByRole('button', {name: 'Lock'}));
    expect(await screen.findByRole('heading', {name: 'Unlock your secret store'})).toBeDefined();
  });
});

describe('locking the store', () => {
  it('offers no lock for a store that opens by itself', async () => {
    openApp(fakeApi({state: 'unlocked', keySource: 'file'}));

    expect(await screen.findByRole('heading', {name: 'Secrets'})).toBeDefined();
    expect(screen.queryByRole('button', {name: 'Lock'})).toBeNull();
  });
});
