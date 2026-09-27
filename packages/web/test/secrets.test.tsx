import {cleanup, screen, within} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';

import {fakeApi} from './fake-api.ts';
import {openApp} from './render.tsx';

afterEach(cleanup);

const rowOf = async (name: string): Promise<HTMLElement> =>
  (await screen.findByText(name)).closest('li') as HTMLElement;

describe('secrets the configuration needs', () => {
  it('are listed as missing, with the field to type their value', async () => {
    const api = fakeApi({state: 'unlocked', keySource: 'passphrase'});
    api.required.set('work-imap', ['amex', 'receipts']);
    const {user} = openApp(api);
    const row = await rowOf('work-imap');

    expect(within(row).getByText('Missing').className).toBe('badge failed');
    expect(within(row).getByText('Used by amex, receipts')).toBeDefined();
    await user.type(within(row).getByLabelText('Value of work-imap'), 'app-password-value');
    await user.click(within(row).getByRole('button', {name: 'Save'}));

    expect(await within(await rowOf('work-imap')).findByText('Stored')).toBeDefined();
    expect(api.calls).toEqual([['setSecret', 'work-imap']]);
    expect(document.body.textContent).not.toContain('app-password-value');
  });

  it('can be replaced, and warn which connections their removal would break', async () => {
    const api = fakeApi({state: 'unlocked', keySource: 'file'});
    api.required.set('work-imap', ['amex']);
    api.stored.set('work-imap', 'old');
    const {user} = openApp(api);
    const row = await rowOf('work-imap');

    await user.click(within(row).getByRole('button', {name: 'Replace'}));
    await user.click(within(row).getByRole('button', {name: 'Cancel'}));
    await user.click(within(row).getByRole('button', {name: 'Remove'}));
    expect(api.calls).toEqual([]);
    await user.click(within(row).getByRole('button', {name: 'Remove, breaking amex'}));

    expect(await within(await rowOf('work-imap')).findByText('Missing')).toBeDefined();
    expect(api.calls).toEqual([['removeSecret', 'work-imap']]);
  });
});

describe('multi-line secrets', () => {
  it('are loaded whole from a file, line breaks included', async () => {
    const api = fakeApi({state: 'unlocked', keySource: 'passphrase'});
    api.required.set('enable-banking-key', ['enable-banking (all its connections)']);
    const {user} = openApp(api);
    const row = await rowOf('enable-banking-key');
    const pem = '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n';

    await user.upload(
      within(row).getByLabelText('Load enable-banking-key from a file'),
      new File([pem], 'app.pem'),
    );

    expect(await within(await rowOf('enable-banking-key')).findByText('Stored')).toBeDefined();
    expect(api.stored.get('enable-banking-key')).toBe(pem);
  });
});

describe('shared secrets from a file', () => {
  it('are saved whole under the name typed first', async () => {
    const api = fakeApi({state: 'unlocked', keySource: 'passphrase'});
    const {user} = openApp(api);
    const pem = '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n';
    await user.upload(await screen.findByLabelText('Load from a file'), new File([pem], 'app.pem'));
    expect(screen.getByRole('alert').textContent).toBe('Use lowercase letters, digits and dashes.');

    await user.type(screen.getByLabelText('Name'), 'enable-banking-key');
    await user.upload(screen.getByLabelText('Load from a file'), new File([pem], 'app.pem'));

    expect(await within(await rowOf('enable-banking-key')).findByText('Stored')).toBeDefined();
    expect(api.stored.get('enable-banking-key')).toBe(pem);
  });
});

describe('other secrets', () => {
  it('are added under a valid name', async () => {
    const api = fakeApi({state: 'unlocked', keySource: 'passphrase'});
    const {user} = openApp(api);
    await user.type(await screen.findByLabelText('Name'), 'Bad Name');
    await user.type(screen.getByLabelText('Value'), 'value');
    await user.click(screen.getByRole('button', {name: 'Save secret'}));
    expect(screen.getByRole('alert').textContent).toBe('Use lowercase letters, digits and dashes.');

    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'spare-key');
    await user.click(screen.getByRole('button', {name: 'Save secret'}));

    expect(within(await rowOf('spare-key')).getByText('Not used by any connection')).toBeDefined();
    expect(screen.getByLabelText<HTMLInputElement>('Value').value).toBe('');
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

describe('shared secrets', () => {
  it('show which shared secret an instance secret stands for', async () => {
    const api = fakeApi({state: 'unlocked', keySource: 'passphrase'});
    api.required.set('email-alerts:amex:imap-password', ['Amex']);
    api.stored.set('email-alerts:amex:imap-password', '${work-imap}');
    openApp(api);

    expect(
      within(await rowOf('email-alerts:amex:imap-password')).getByText(
        'Uses the shared secret work-imap',
      ),
    ).toBeDefined();
  });
});
