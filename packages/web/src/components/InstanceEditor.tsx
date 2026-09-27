import type {InstanceInfo, PluginInfo, VariableSpecInfo} from '@caton-ai/api';
import type {ReactNode} from 'react';

import type {Api} from '../api.ts';
import {isSecret} from '../configuration-form.ts';
import {onSubmit} from '../forms.ts';
import {text} from '../text.ts';
import {saveInstance, useInstanceForm} from '../use-instance-editor.ts';
import type {Configuration, InstanceForm} from '../use-instance-editor.ts';
import {useAction} from '../use-action.ts';
import {EditorActions, PluginChoice, TitleField} from './EditorParts.tsx';
import {Notice} from './Layout.tsx';
import {SecretVariable} from './SecretVariable.tsx';
import {SettingVariable} from './SettingVariable.tsx';

type VariableProps = Readonly<{
  spec: VariableSpecInfo;
  plugin: PluginInfo;
  form: InstanceForm;
  data: Configuration;
  instanceId: string | undefined;
}>;

function Variable({spec, plugin, form, data, instanceId}: VariableProps): ReactNode {
  if (!isSecret(spec)) {
    return (
      <SettingVariable
        spec={spec}
        value={form.settings[spec.key] ?? ''}
        onChange={value => {
          form.setSettings({...form.settings, [spec.key]: value});
        }}
      />
    );
  }
  const key = `${plugin.id}:${instanceId ?? ''}:${spec.key}`;
  const shared = data.secrets
    .filter(entry => !entry.name.includes(':') && entry.stored)
    .map(entry => entry.name);
  return (
    <SecretVariable
      spec={spec}
      shared={shared}
      entry={data.secrets.find(entry => entry.name === key)}
      value={form.secrets[spec.key] ?? ''}
      onChange={value => {
        form.setSecrets({...form.secrets, [spec.key]: value});
      }}
    />
  );
}

function Variables({plugin, form, data, instanceId}: Omit<VariableProps, 'spec'>): ReactNode {
  return plugin.variables.map(spec => (
    <Variable
      key={spec.key}
      spec={spec}
      plugin={plugin}
      form={form}
      data={data}
      instanceId={instanceId}
    />
  ));
}

type EditorProps = Readonly<{
  api: Api;
  data: Configuration;
  instance?: InstanceInfo;
  onSaved: () => void;
  onCancel: () => void;
}>;

function Heading({
  data,
  form,
  instance,
}: Readonly<{
  data: Configuration;
  form: InstanceForm;
  instance: InstanceInfo | undefined;
}>): ReactNode {
  return (
    <>
      <h2>
        {instance === undefined
          ? text.configuration.newTitle
          : text.configuration.editTitle(instance.title)}
      </h2>
      {instance === undefined ? (
        <PluginChoice
          plugins={data.plugins}
          chosen={form.plugin?.id}
          onChoose={form.choosePlugin}
        />
      ) : null}
      <TitleField value={form.title} onChange={form.setTitle} />
    </>
  );
}

/** The form of one instance, generated from its plugin's contract. */
export function InstanceEditor({api, data, instance, onSaved, onCancel}: EditorProps): ReactNode {
  const form = useInstanceForm(data, instance);
  const {busy, error, run} = useAction();
  const submit = onSubmit(() => void run(() => saveInstance(api, form, instance).then(onSaved)));
  const remove =
    instance === undefined
      ? {}
      : {onRemove: () => void run(() => api.removeInstance(instance.id).then(onSaved))};
  return (
    <form className="card editor" onSubmit={submit} aria-busy={busy}>
      <Heading data={data} form={form} instance={instance} />
      {form.plugin === undefined ? null : (
        <Variables plugin={form.plugin} form={form} data={data} instanceId={instance?.id} />
      )}
      <Notice message={error} />
      <EditorActions
        busy={busy}
        canSave={form.title.trim() !== ''}
        onCancel={onCancel}
        {...remove}
      />
    </form>
  );
}
