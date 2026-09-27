import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {afterEach, describe, expect, it} from 'vitest';

import {emailAlertsConnector} from '../src/index.ts';
import {recipe} from './mail.ts';

const {manifest} = emailAlertsConnector;
const directories: string[] = [];

afterEach(() => {
  directories.splice(0).forEach(directory => {
    rmSync(directory, {recursive: true, force: true});
  });
});

/** A plugin folder holding one recipe file. */
function pluginDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'caton-email-plugin-'));
  directories.push(directory);
  mkdirSync(join(directory, 'recipes'));
  writeFileSync(join(directory, 'recipes', 'example.json'), JSON.stringify(recipe()));
  writeFileSync(join(directory, 'recipes', 'notes.txt'), 'ignored');
  return directory;
}

/** A value for every declared variable, so the declared contract and the validation cannot drift. */
const declared: Record<string, unknown> = Object.fromEntries(
  manifest.variables.map(spec => {
    const values = {number: 993, list: ['example-card-charge']} as Record<string, unknown>;
    return [spec.key, values[spec.kind] ?? `${spec.key}-value`];
  }),
);

describe('emailAlertsConnector contract', () => {
  it('declares its variables with help, and that each instance chooses its server', () => {
    expect(manifest).toMatchObject({
      id: 'email-alerts',
      title: 'Email alerts',
      network: ['variable:imap-host'],
    });
    expect(manifest.variables.find(spec => spec.key === 'imap-password')?.kind).toBe('secret');
    expect(manifest.variables.every(spec => spec.help.length > 40)).toBe(true);
  });

  it('builds a source from exactly the variables it declares, with recipes from its folder', async () => {
    const source = emailAlertsConnector.createSource(declared, {
      pluginDirectory: pluginDirectory(),
    });

    expect(await source.listAccounts()).toMatchObject([
      {institution: 'Example Card', source: 'email-alerts'},
    ]);
  });
});

describe('emailAlertsConnector variables', () => {
  it('say which are wrong, never what they hold, and which recipes exist', () => {
    const directory = pluginDirectory();
    const build = (overrides: Record<string, unknown>, folder = directory): unknown =>
      emailAlertsConnector.createSource({...declared, ...overrides}, {pluginDirectory: folder});

    expect(() => build({'imap-password': '', 'imap-port': 'SECRETVALUE'})).toThrow(
      'Invalid email alerts variables: imap-port, imap-password',
    );
    expect(() => build({recipes: ['missing']})).toThrow(
      'Unknown email recipe "missing"; the library has: example-card-charge',
    );
    expect(() => build({}, '/nowhere')).toThrow(
      'Unknown email recipe "example-card-charge"; the library has: none',
    );
  });
});
