import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';

import {httpApi} from './api.ts';
import {App} from './App.tsx';
import './styles.css';

let token = new URLSearchParams(window.location.hash.slice(1)).get('token');
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
      <App api={httpApi} address={address} />
    </StrictMode>,
  );
}
