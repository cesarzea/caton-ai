import {cleanup, screen, within} from '@testing-library/react';
import type {UserEvent} from '@testing-library/user-event';
import {afterEach, describe, expect, it} from 'vitest';

import {fakeApi} from './fake-api.ts';
import type {FakeApi} from './fake-api.ts';
import {openApp} from './render.tsx';

afterEach(cleanup);

function unlocked(): FakeApi {
  return fakeApi({state: 'unlocked', keySource: 'passphrase'});
}

const CLAUDE = {
  id: 'claude',
  title: 'Claude',
  plugin: 'llm',
  settings: {provider: 'anthropic', model: 'claude-opus-5'},
};

/** Opens the form of a new model and fills its name, provider and model. */
async function addModel(api: FakeApi, title: string, provider: string): Promise<UserEvent> {
  const {user} = openApp(api);
  await user.click(await screen.findByRole('button', {name: 'Add a language model'}));
  await user.type(screen.getByLabelText('Model name'), title);
  await user.selectOptions(screen.getByLabelText('Provider'), provider);
  await user.type(screen.getByLabelText('Model'), 'claude-opus-5');
  return user;
}

describe('adding a language model', () => {
  it("asks for the provider's key once, saving it encrypted for all its models", async () => {
    const api = unlocked();
    const user = await addModel(api, 'Claude', 'anthropic');

    expect(screen.queryByLabelText('Address')).toBeNull();
    expect(screen.queryByRole('radio')).toBeNull();
    await user.type(screen.getByLabelText(/API key/u), 'sk-test');
    expect(screen.getByText(/Saved encrypted as anthropic-api-key/u)).toBeDefined();
    await user.click(screen.getByRole('button', {name: 'Save'}));

    expect(await screen.findByRole('button', {name: 'Add a language model'})).toBeDefined();
    expect(api.calls).toEqual([
      ['createInstance', {title: 'Claude', plugin: 'llm', settings: CLAUDE.settings}],
      ['setSecret', 'anthropic-api-key'],
      ['setSecret', 'llm:claude:api-key'],
    ]);
    expect(api.stored.get('anthropic-api-key')).toBe('sk-test');
    expect(api.stored.get('llm:claude:api-key')).toBe('${anthropic-api-key}');
  });
});

describe('adding another model of the same provider', () => {
  it('reuses the saved key without asking for it', async () => {
    const api = unlocked();
    api.stored.set('anthropic-api-key', 'sk-test');
    const user = await addModel(api, 'Haiku', 'anthropic');

    expect(screen.getByText('Saved as anthropic-api-key')).toBeDefined();
    expect(document.getElementById('secret-api-key')).toBeNull();
    await user.click(screen.getByRole('button', {name: 'Replace the key'}));
    expect(document.getElementById('secret-api-key')).not.toBeNull();
    await user.click(screen.getByRole('button', {name: 'Save'}));

    expect(await screen.findByRole('button', {name: 'Add a language model'})).toBeDefined();
    expect(api.calls.slice(1)).toEqual([['setSecret', 'llm:haiku:api-key']]);
  });

  it('asks a local model for its address, not a key', async () => {
    await addModel(unlocked(), 'Local', 'ollama');

    expect(screen.getByLabelText(/Address/u)).toBeDefined();
    expect(screen.queryByLabelText(/API key/u)).toBeNull();
  });
});

/** The fake configuration with a Claude model, used by the Amex connection. */
function withClaude(): FakeApi {
  const api = unlocked();
  const amex = api.configured[0];
  if (amex !== undefined) {
    api.configured[0] = {...amex, settings: {...amex.settings, model: 'claude'}};
  }
  api.configured.push(CLAUDE);
  return api;
}

describe('the language models list', () => {
  it('shows what each model is, what it lacks and who uses it', async () => {
    openApp(withClaude());
    const row = (await screen.findByRole('rowheader', {name: 'Claude'})).closest('tr');
    const cells = within(row ?? document.body);

    expect(cells.getByText('anthropic · claude-opus-5')).toBeDefined();
    expect(cells.getByText('Needs: API key')).toBeDefined();
    expect(cells.getByText('Amex')).toBeDefined();
  });

  it('warns which connections break before removing a model they use', async () => {
    const api = withClaude();
    const {user} = openApp(api);
    await user.click(await screen.findByRole('button', {name: 'Edit Claude'}));
    await user.click(screen.getByRole('button', {name: 'Remove model'}));
    await user.click(screen.getByRole('button', {name: 'Remove, breaking Amex'}));

    expect(api.calls.at(-1)).toEqual(['removeInstance', 'claude']);
  });
});

describe('choosing a model in a connection', () => {
  it('offers the configured models and a thinking effort, saved with the connection', async () => {
    const api = withClaude();
    const {user} = openApp(api);
    await user.click(await screen.findByRole('button', {name: 'Edit Amex'}));

    expect(screen.getByLabelText(/Language model/u)).toHaveProperty('value', 'claude');
    expect(screen.getByLabelText(/Thinking effort/u)).toHaveProperty('value', '');
    await user.selectOptions(screen.getByLabelText(/Thinking effort/u), 'High');
    await user.click(screen.getByRole('button', {name: 'Save'}));

    expect(api.calls[0]).toEqual([
      'updateInstance',
      'amex',
      {
        title: 'Amex',
        settings: {
          'imap-user': 'me@example.com',
          'imap-port': 993,
          model: 'claude',
          effort: 'high',
        },
      },
    ]);
  });
});

describe('a connection without models to choose', () => {
  it('says where to add one, and lists only connector plugins', async () => {
    const {user} = openApp(unlocked());
    await user.click(await screen.findByRole('button', {name: 'Add a connection'}));

    expect(screen.getByText(/No language model yet/u)).toBeDefined();
    expect(screen.queryByRole('radio', {name: /Language model/u})).toBeNull();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
  });
});
