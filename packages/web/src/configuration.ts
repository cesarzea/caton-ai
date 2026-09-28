import type {InstanceInfo, PluginInfo, SecretEntry} from '@caton-ai/api';

/** Plugins, instances and secrets, loaded together so every panel shows the same state. */
export type Configuration = Readonly<{
  plugins: PluginInfo[];
  instances: InstanceInfo[];
  secrets: SecretEntry[];
}>;
