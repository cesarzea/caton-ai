import type {CommandContext} from '../src/context.ts';

export interface FakeConfigFile extends Pick<CommandContext, 'configFile' | 'catalog'> {
  /** What the configuration file holds, and every version written to it. */
  readonly file: {current: unknown; readonly written: unknown[]};
}

/** A configuration file in memory, and no installed plugin variables. */
export function fakeConfigFile(): FakeConfigFile {
  const file: FakeConfigFile['file'] = {current: {}, written: []};
  return {
    file,
    catalog: new Map(),
    configFile: {
      read: () => file.current,
      replace: config => {
        file.current = config;
        file.written.push(config);
        return '/config/config.json.bak-2026-09-27';
      },
    },
  };
}
