import type {InstanceInfo, PluginInfo} from '@caton-ai/api';
import type {ReactNode} from 'react';

import type {Api} from '../api.ts';
import {onSubmit} from '../forms.ts';
import {text} from '../text.ts';
import {saveInstance, useInstanceForm} from '../use-instance-editor.ts';
import type {Configuration} from '../configuration.ts';
import type {InstanceForm} from '../use-instance-editor.ts';
import {useAction} from '../use-action.ts';
import {pluginsOfKind} from '../variables.ts';
import {EditorActions, PluginChoice, TitleField} from './EditorParts.tsx';
import {Notice} from './Layout.tsx';
import {Variables} from './Variables.tsx';

type Kind = PluginInfo['kind'];

type HeadingProps = Readonly<{
  kind: Kind;
  plugins: readonly PluginInfo[];
  form: InstanceForm;
  instance: InstanceInfo | undefined;
}>;

function Heading({kind, plugins, form, instance}: HeadingProps): ReactNode {
  const words = text.editor[kind];
  return (
    <>
      <h2>{instance === undefined ? words.newTitle : words.editTitle(instance.title)}</h2>
      {instance === undefined && plugins.length > 1 ? (
        <PluginChoice plugins={plugins} chosen={form.plugin?.id} onChoose={form.choosePlugin} />
      ) : null}
      <TitleField
        label={words.name}
        help={words.nameHelp}
        value={form.title}
        onChange={form.setTitle}
      />
    </>
  );
}

/** The removal labels, naming what would break. */
function removalLabels(kind: Kind, usedBy: readonly string[]): {remove: string; confirm: string} {
  const words = text.editor[kind];
  return {
    remove: words.remove,
    confirm: usedBy.length === 0 ? words.confirmRemove : text.secrets.confirmUsed(usedBy),
  };
}

type EditorProps = Readonly<{
  api: Api;
  data: Configuration;
  kind: Kind;
  instance?: InstanceInfo;
  /** Who would break if it were removed, such as the connections using a model. */
  usedBy?: readonly string[];
  onSaved: () => void;
  onCancel: () => void;
}>;

/** The form of one instance, generated from its plugin's contract. */
export function InstanceEditor(props: EditorProps): ReactNode {
  const {api, data, kind, instance, usedBy = [], onSaved, onCancel} = props;
  const plugins = pluginsOfKind(data, kind);
  const form = useInstanceForm(data, instance, plugins);
  const {busy, error, run} = useAction();
  const submit = onSubmit(
    () => void run(() => saveInstance(api, data, form, instance).then(onSaved)),
  );
  const remove =
    instance === undefined
      ? {}
      : {onRemove: () => void run(() => api.removeInstance(instance.id).then(onSaved))};
  return (
    <form className="card editor" onSubmit={submit} aria-busy={busy}>
      <Heading kind={kind} plugins={plugins} form={form} instance={instance} />
      {form.plugin === undefined ? null : (
        <Variables plugin={form.plugin} form={form} data={data} instanceId={instance?.id} />
      )}
      <Notice message={error} />
      <EditorActions
        busy={busy}
        canSave={form.title.trim() !== ''}
        labels={removalLabels(kind, usedBy)}
        onCancel={onCancel}
        {...remove}
      />
    </form>
  );
}
