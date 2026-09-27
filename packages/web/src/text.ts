/** Every string of the interface, in one place, ready for translation. */
export const text = {
  product: 'Catón AI',
  tagline: 'Your financial watchdog, running on this computer only',
  loading: 'Loading…',
  signedOut: {
    title: 'Sign in from your terminal',
    body: 'Open the one-time link printed by caton serve. Each link works once, for ten minutes.',
  },
  lock: 'Lock',
  store: {
    createTitle: 'Create your secret store',
    createIntro:
      'Passwords and keys are kept encrypted. Choose where the key that opens them lives; losing it loses every secret.',
    modes: {
      passphrase: ['Passphrase', 'Most secure. You type it once each time Catón AI starts.'],
      file: ['Key file', 'Opens by itself. For servers, or a container secret under /run/secrets.'],
      'os-store': [
        'Operating system',
        'Opens by itself, with the key kept by macOS Keychain or Linux Secret Service.',
      ],
    },
    passphrase: 'Passphrase',
    repeat: 'Repeat the passphrase',
    keyFile: 'Absolute path of the key file',
    create: 'Create the store',
    tooShort: (minimum: number) => `Use at least ${String(minimum)} characters.`,
    mismatch: 'The passphrases do not match.',
    unlockTitle: 'Unlock your secret store',
    unlock: 'Unlock',
    unlockFailed: 'The store could not open by itself:',
  },
  connections: {
    title: 'Connections',
    empty: 'No connections configured yet.',
    columns: ['Connection', 'Type', 'Status', 'Last sync', 'Problem'],
    outcome: {ok: 'Synced', failed: 'Failing', never: 'Never synced'},
  },
  secrets: {
    title: 'Secrets',
    intro:
      'Refer to a secret in the configuration as age:<name>. Values can be replaced, never shown.',
    empty: 'No secrets yet.',
    name: 'Name',
    value: 'Value',
    save: 'Save secret',
    remove: 'Remove',
    confirm: 'Confirm removal',
    invalidName: 'Use lowercase letters, digits and dashes.',
  },
} as const;
