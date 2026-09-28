import {cleanup, fireEvent, screen, within} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';

import {fakeApi} from './fake-api.ts';
import type {FakeApi} from './fake-api.ts';
import {openApp} from './render.tsx';

afterEach(cleanup);

function unlocked(): FakeApi {
  return fakeApi({state: 'unlocked', keySource: 'passphrase'});
}

describe('adding a connection', () => {
  it('shows each variable with its help, then saves settings and secrets apart', async () => {
    const api = unlocked();
    const {user} = openApp(api);
    await user.click(await screen.findByRole('button', {name: 'Add a connection'}));
    await user.type(screen.getByLabelText('Connection name'), 'Amex Work');
    await user.type(screen.getByLabelText('Email address'), 'me@example.com');
    await user.type(screen.getByLabelText(/App password/u), 'app-password-value');

    expect(screen.getByRole('link', {name: 'Google Account'}).getAttribute('href')).toBe(
      'https://myaccount.google.com/apppasswords',
    );
    expect(screen.getByLabelText('IMAP port').getAttribute('value')).toBe('993');
    await user.click(screen.getByRole('button', {name: 'Save'}));

    expect(await screen.findByRole('button', {name: 'Add a connection'})).toBeDefined();
    expect(api.calls).toEqual([
      [
        'createInstance',
        {
          title: 'Amex Work',
          plugin: 'email-alerts',
          settings: {'imap-user': 'me@example.com', 'imap-port': 993},
        },
      ],
      ['setSecret', 'email-alerts:amex-work:imap-password'],
    ]);
    expect(api.stored.get('email-alerts:amex-work:imap-password')).toBe('app-password-value');
  });
});

describe('adding a connection with a shared secret', () => {
  it('can point a secret at a shared one instead of typing it', async () => {
    const api = unlocked();
    api.stored.set('work-imap', 'pw');
    const {user} = openApp(api);
    await user.click(await screen.findByRole('button', {name: 'Add a connection'}));
    await user.type(screen.getByLabelText('Connection name'), 'Receipts');
    await user.type(screen.getByLabelText('Email address'), 'me@example.com');
    await user.selectOptions(
      screen.getByRole('combobox', {name: 'Or use a shared secret'}),
      'work-imap',
    );

    expect(screen.getByText('Uses the shared secret work-imap')).toBeDefined();
    expect(document.getElementById('secret-imap-password')).toBeNull();
    await user.click(screen.getByRole('button', {name: 'Save'}));
    expect(await screen.findByRole('button', {name: 'Add a connection'})).toBeDefined();
    expect(api.stored.get('email-alerts:receipts:imap-password')).toBe('${work-imap}');
  });
});

describe('choosing between a shared secret and its own value', () => {
  it('hides the value while a shared secret is chosen, and shows it again for its own value', async () => {
    const api = unlocked();
    api.stored.set('work-imap', 'pw');
    const {user} = openApp(api);
    await user.click(await screen.findByRole('button', {name: 'Add a connection'}));
    const picker = screen.getByRole('combobox', {name: 'Or use a shared secret'});

    expect(document.getElementById('secret-imap-password')).not.toBeNull();
    await user.selectOptions(picker, 'work-imap');
    expect(document.getElementById('secret-imap-password')).toBeNull();
    await user.selectOptions(picker, 'No, its own value');
    expect(document.getElementById('secret-imap-password')).not.toBeNull();
  });
});

describe('adding a connection of another plugin', () => {
  it('loads a key file whole, and refuses numbers that are not', async () => {
    const api = unlocked();
    const {user} = openApp(api);
    await user.click(await screen.findByRole('button', {name: 'Add a connection'}));
    await user.clear(screen.getByLabelText('IMAP port'));
    await user.type(screen.getByLabelText('IMAP port'), 'abc');
    await user.type(screen.getByLabelText('Connection name'), 'X');
    await user.click(screen.getByRole('button', {name: 'Save'}));
    expect(screen.getByRole('alert').textContent).toBe('IMAP port must be a whole number');

    await user.click(screen.getByRole('radio', {name: /Enable Banking/u}));
    // The first loader is the form's; the secrets panel below has its own.
    const formLoader = screen.getAllByLabelText('Load from a file').at(0) ?? document.body;
    await user.upload(formLoader, new File(['-----BEGIN PRIVATE KEY-----\nabc\n'], 'app.pem'));
    expect(screen.getByText('A new value will be saved.')).toBeDefined();
  });
});

describe('editing a connection', () => {
  it('keeps its id, updates its settings, and removes it after a second click', async () => {
    const api = unlocked();
    const {user} = openApp(api);
    await user.click(await screen.findByRole('button', {name: 'Edit Amex'}));
    expect(screen.getByRole('heading', {name: 'Edit Amex'})).toBeDefined();
    await user.clear(screen.getByLabelText('Connection name'));
    await user.type(screen.getByLabelText('Connection name'), 'Amex (work)');
    await user.click(screen.getByRole('button', {name: 'Save'}));
    expect(api.calls[0]).toEqual([
      'updateInstance',
      'amex',
      {title: 'Amex (work)', settings: {'imap-user': 'me@example.com', 'imap-port': 993}},
    ]);

    await user.click(await screen.findByRole('button', {name: 'Edit Amex'}));
    await user.click(screen.getByRole('button', {name: 'Remove connection'}));
    await user.click(screen.getByRole('button', {name: 'Confirm: remove this connection'}));
    expect(api.calls.at(-1)).toEqual(['removeInstance', 'amex']);
  });

  it('goes back to the list when cancelled', async () => {
    const {user} = openApp(unlocked());
    await user.click(await screen.findByRole('button', {name: 'Edit Amex'}));
    fireEvent.click(screen.getByRole('button', {name: 'Cancel'}));

    expect(within(await screen.findByRole('table')).getByText('Amex')).toBeDefined();
  });
});

describe('editing a connection saved before a variable existed', () => {
  it('shows the new variable at its default', async () => {
    const {user} = openApp(unlocked());
    await user.click(await screen.findByRole('button', {name: 'Edit Amex'}));

    expect(screen.getByLabelText('IMAP port').getAttribute('value')).toBe('993');
  });
});
