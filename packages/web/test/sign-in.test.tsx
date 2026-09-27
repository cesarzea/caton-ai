import {cleanup, screen} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';

import {fakeApi} from './fake-api.ts';
import {openApp} from './render.tsx';

afterEach(cleanup);

describe('signing in', () => {
  it('exchanges the one-time token, then shows what to do first', async () => {
    const api = fakeApi();
    const {forgotten} = openApp(api, 'valid');

    expect(await screen.findByRole('heading', {name: 'Create your secret store'})).toBeDefined();
    expect(api.calls[0]).toEqual(['signIn', 'valid']);
    expect(forgotten()).toBe(true);
  });

  it('explains how to sign in without a session, and why a link failed', async () => {
    const withoutSession = fakeApi();
    withoutSession.signedIn = false;
    openApp(withoutSession);
    expect(await screen.findByRole('heading', {name: 'Sign in from your terminal'})).toBeDefined();
    expect(screen.queryByRole('alert')).toBeNull();
    cleanup();

    openApp(fakeApi(), 'used');
    expect((await screen.findByRole('alert')).textContent).toBe(
      'This link has expired or was already used',
    );
  });
});
