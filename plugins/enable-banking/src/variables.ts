import type {VariableSpec} from '@caton-ai/core';

export const VARIABLES: readonly VariableSpec[] = [
  {
    key: 'app-id',
    label: 'Application ID',
    kind: 'text',
    required: true,
    help: [
      'The ID of your application in [Enable Banking](https://enablebanking.com), shown in its control panel.',
      'Use an application in **restricted mode**: it can only read the accounts you link to it yourself.',
    ].join('\n\n'),
  },
  {
    key: 'private-key',
    label: 'Private key',
    kind: 'secret-file',
    required: true,
    help: [
      'The RSA private key of that application: the `.pem` file saved when the application was registered. Keep it safe: whoever has it and a session ID can read those accounts.',
      'Load the file whole. When several banks share one application, save the key once as a **shared secret** and write `${its-name}` in each of them.',
    ].join('\n\n'),
  },
  {
    key: 'session-id',
    label: 'Session ID',
    kind: 'text',
    required: true,
    help: [
      'The ID of the session (consent) created when you linked and authorised this bank for the application.',
      'A consent lasts up to 180 days. When it expires, this connection turns red until the bank is authorised again and its new session ID is entered here.',
    ].join('\n\n'),
  },
];
