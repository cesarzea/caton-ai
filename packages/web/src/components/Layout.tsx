import type {ReactNode} from 'react';

import {text} from '../text.ts';

type LayoutProps = Readonly<{children: ReactNode; onLock?: () => void}>;

export function Layout({children, onLock}: LayoutProps): ReactNode {
  return (
    <div className="page">
      <header className="masthead">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            C
          </span>
          <div>
            <h1>{text.product}</h1>
            <p className="tagline">{text.tagline}</p>
          </div>
        </div>
        {onLock === undefined ? null : (
          <button type="button" className="button secondary" onClick={onLock}>
            {text.lock}
          </button>
        )}
      </header>
      <main>{children}</main>
    </div>
  );
}

export function Notice({message}: Readonly<{message: string | null}>): ReactNode {
  return message === null ? null : (
    <p className="notice" role="alert">
      {message}
    </p>
  );
}
