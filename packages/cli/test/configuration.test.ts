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

describe('pluginInfos', () => {
  it('shows each plugin contract as the web interface needs it', () => {
    const [info] = pluginInfos([
      {
        manifest: {
          id: 'p',
          version: '1',
          title: 'P',
          description: 'D',
          network: [],
          variables: [
            {key: 'k', label: 'K', kind: 'choice', required: true, choices: ['a'], help: 'H'},
          ],
        },
        createSource: () => {
          throw new Error('unused');
        },
      },
    ]);

    expect(info).toEqual({
      id: 'p',
      title: 'P',
      description: 'D',
      network: [],
      variables: [
        {key: 'k', label: 'K', kind: 'choice', required: true, choices: ['a'], help: 'H'},
      ],
    });
  });
});
