import type {PluginInfo, VariableSpecInfo} from '@caton-ai/api';
import type {ReactNode} from 'react';

import {isSecret} from '../configuration-form.ts';
import type {Configuration} from '../configuration.ts';
import type {InstanceForm} from '../use-instance-editor.ts';
import {applies, modelInstances, sharedSecretName} from '../variables.ts';
import {EffortVariable, ModelVariable} from './ModelVariables.tsx';
import {ProviderKey} from './ProviderKey.tsx';
import {SecretVariable} from './SecretVariable.tsx';
import {SettingVariable} from './SettingVariable.tsx';

type Props = Readonly<{
  spec: VariableSpecInfo;
  plugin: PluginInfo;
  form: InstanceForm;
  data: Configuration;
  instanceId: string | undefined;
}>;

function Setting({spec, form, data}: Props): ReactNode {
  const shown = {
    spec,
    value: form.settings[spec.key] ?? '',
    onChange: (value: string) => {
      form.setSettings({...form.settings, [spec.key]: value});
    },
  };
  if (spec.kind === 'model') {
    return <ModelVariable {...shown} models={modelInstances(data)} />;
  }
  return spec.kind === 'effort' ? <EffortVariable {...shown} /> : <SettingVariable {...shown} />;
}

function Secret({spec, plugin, form, data, instanceId}: Props): ReactNode {
  const value = form.secrets[spec.key] ?? '';
  const onChange = (typed: string): void => {
    form.setSecrets({...form.secrets, [spec.key]: typed});
  };
  const perProvider = sharedSecretName(spec, form.settings, plugin.variables);
  if (perProvider !== null) {
    const stored = data.secrets.some(entry => entry.name === perProvider && entry.stored);
    return <ProviderKey {...{spec, value, onChange, stored}} name={perProvider} />;
  }
  const key = `${plugin.id}:${instanceId ?? ''}:${spec.key}`;
  const shared = data.secrets
    .filter(entry => !entry.name.includes(':') && entry.stored)
    .map(entry => entry.name);
  const entry = data.secrets.find(candidate => candidate.name === key);
  return <SecretVariable {...{spec, shared, entry, value, onChange}} />;
}

/** The variables that apply to the instance, each entered as its kind needs. */
export function Variables(props: Omit<Props, 'spec'>): ReactNode {
  const {plugin, form} = props;
  return plugin.variables
    .filter(spec => applies(spec, form.settings, plugin.variables))
    .map(spec =>
      isSecret(spec) ? (
        <Secret key={spec.key} spec={spec} {...props} />
      ) : (
        <Setting key={spec.key} spec={spec} {...props} />
      ),
    );
}
