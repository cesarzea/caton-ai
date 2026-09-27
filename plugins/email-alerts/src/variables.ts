import type {VariableSpec} from '@caton-ai/core';

export const VARIABLES: readonly VariableSpec[] = [
  {
    key: 'imap-host',
    label: 'IMAP server',
    kind: 'text',
    required: true,
    default: 'imap.gmail.com',
    help: 'The IMAP server of the mailbox. For Gmail and Google Workspace it is `imap.gmail.com`. Only encrypted connections (TLS) are used.',
  },
  {
    key: 'imap-port',
    label: 'IMAP port',
    kind: 'number',
    required: true,
    default: 993,
    help: 'The TLS port of the IMAP server; almost always `993`.',
  },
  {
    key: 'imap-user',
    label: 'Email address',
    kind: 'text',
    required: true,
    help: 'The address of the mailbox that receives the alerts, such as `me@example.com`.',
  },
  {
    key: 'imap-password',
    label: 'App password',
    kind: 'secret',
    required: true,
    help: [
      'An **app password** for this mailbox, never your usual password.',
      '- **Gmail and Google Workspace:** 2-Step Verification must be on. Create the password at [Google Account → App passwords](https://myaccount.google.com/apppasswords). In Google Workspace, the administrator must also allow IMAP access.',
      '- **Other providers:** look for "app passwords" in the security settings of your account.',
      'The password opens the whole mailbox, but Catón AI only reads the folder you choose: it never marks, moves or deletes an email. When several mailboxes of the same account are configured, save it once as a **shared secret** and write `${its-name}` in each.',
    ].join('\n\n'),
  },
  {
    key: 'imap-folder',
    label: 'Folder',
    kind: 'text',
    required: false,
    help: 'The folder to read. When empty, the folder holding all mail (Gmail\'s "All Mail") is read, or the inbox if there is none.',
  },
  {
    key: 'auth-server',
    label: 'Trusted receiving server',
    kind: 'text',
    required: true,
    default: 'mx.google.com',
    help: [
      'The server that receives your email and checks that each message really comes from its sender (DKIM and DMARC). Only messages it verified are read, so a forged alert is never taken as a real charge.',
      'For Gmail and Google Workspace it is `mx.google.com`.',
    ].join('\n\n'),
  },
  {
    key: 'recipes',
    label: 'Recipes',
    kind: 'list',
    required: true,
    help: [
      'The kinds of email to read. Each recipe describes one sender and how to read its alerts, as a file in the plugin folder (`plugins/email-alerts/recipes` in the configuration directory).',
      'Choose the recipes of the senders that write to this mailbox.',
    ].join('\n\n'),
  },
];
