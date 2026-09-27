import {cleanup, screen, within} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';

import {fakeApi} from './fake-api.ts';
import {openApp} from './render.tsx';

afterEach(cleanup);

describe('secrets', () => {
  it('are added under a valid name and listed by reference, never by value', async () => {
    const api = fakeApi({state: 'unlocked', keySource: 'passphrase'});
    const {user} = openApp(api);
    await user.type(await screen.findByLabelText('Name'), 'Bad Name');
    await user.type(screen.getByLabelText('Value'), 'app-password-value');
    await user.click(screen.getByRole('button', {name: 'Save secret'}));
    expect(screen.getByRole('alert').textContent).toBe('Use lowercase letters, digits and dashes.');

    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'jaunesistemas-imap');
    await user.click(screen.getByRole('button', {name: 'Save secret'}));

    expect(await screen.findByText('age:jaunesistemas-imap')).toBeDefined();
    expect(document.body.textContent).not.toContain('app-password-value');
    expect(screen.getByLabelText<HTMLInputElement>('Value').value).toBe('');
  });

  it('are removed only after a confirming second click', async () => {
    const api = fakeApi({state: 'unlocked', keySource: 'file'});
    api.secrets.set('old-imap', 'x');
    const {user} = openApp(api);
    const row = (await screen.findByText('age:old-imap')).closest('li') as HTMLElement;

    await user.click(within(row).getByRole('button', {name: 'Remove'}));
    expect(api.calls).toEqual([]);
    await user.click(within(row).getByRole('button', {name: 'Confirm removal'}));

    expect(await screen.findByText('No secrets yet.')).toBeDefined();
    expect(api.calls).toEqual([['removeSecret', 'old-imap']]);
  });
});

describe('connections', () => {
  it('show their state, when they last synced and what is failing', async () => {
    openApp(fakeApi());
    const rows = await screen.findAllByRole('row');

    expect(rows.map(row => within(row).queryAllByRole('cell').at(0)?.textContent)).toEqual([
      undefined,
      'enable-banking',
      'email-alerts',
    ]);
    expect(screen.getByText('Synced').className).toBe('badge ok');
    expect(screen.getByText('Failing').className).toBe('badge failed');
    expect(screen.getByText('1 email(s) could not be read')).toBeDefined();
  });
});
