import {describe, expect, it} from 'vitest';

import {editableConfiguration, pluginInfos} from '../src/configuration.ts';
import {fakeConfigFile} from './fake-config-file.ts';

describe('editableConfiguration', () => {
  it('saves instances keeping other fields, and forgets the cached configuration', () => {
    const {configFile, file} = fakeConfigFile();
    file.current = {instances: [], future: 'kept'};
    let forgotten = 0;
    const configuration = editableConfiguration(
      () => ({instances: []}),
      configFile,
      () => {
        forgotten += 1;
      },
    );

    configuration.save([{id: 'amex', title: 'Amex', plugin: 'email-alerts', settings: {}}]);

    expect(file.current).toEqual({
      instances: [{id: 'amex', title: 'Amex', plugin: 'email-alerts', settings: {}}],
      future: 'kept',
    });
    expect(forgotten).toBe(1);
    expect(configuration.instances()).toEqual([]);
  });
});

const manifest = {
  id: 'p',
  version: '1',
  title: 'P',
  description: 'D',
  network: [],
  variables: [{key: 'k', label: 'K', kind: 'choice', required: true, choices: ['a'], help: 'H'}],
} as const;

const unused = (): never => {
  throw new Error('unused');
};

describe('pluginInfos', () => {
  it('shows each plugin contract as the web interface needs it', () => {
    const infos = pluginInfos({
      connectors: [{manifest, createSource: unused}],
      models: [{manifest: {...manifest, id: 'm', variables: []}, createModel: unused}],
    });

    expect(infos).toEqual([
      {
        id: 'p',
        kind: 'connector',
        title: 'P',
        description: 'D',
        network: [],
        variables: [
          {key: 'k', label: 'K', kind: 'choice', required: true, choices: ['a'], help: 'H'},
        ],
      },
      {id: 'm', kind: 'model', title: 'P', description: 'D', network: [], variables: []},
    ]);
  });
});
