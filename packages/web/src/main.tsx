import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';

import {api} from './api.ts';
import {App} from './App.tsx';
import './styles.css';

const tokenIn = (hash: string): string | null => new URLSearchParams(hash.slice(1)).get('token');

let token = tokenIn(window.location.hash);

// A new sign-in link pasted into an open tab only changes the fragment, which reloads nothing:
// the page would keep the old code and the old session. Start afresh instead.
window.addEventListener('hashchange', () => {
  if (tokenIn(window.location.hash) !== null) {
    window.location.reload();
  }
});
const address = {
  takeToken: () => {
    const taken = token;
    token = null;
    window.history.replaceState(null, '', window.location.pathname);
    return taken;
  },
};

const root = document.getElementById('root');
if (root !== null) {
  createRoot(root).render(
    <StrictMode>
      <App api={api} address={address} />
    </StrictMode>,
  );
}
