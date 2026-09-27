import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {extname, join, relative, sep} from 'node:path';

/** A file of the built interface, served from memory. */
export interface Asset {
  readonly body: Buffer;
  readonly type: string;
}

const TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
};

/**
 * Loads the built interface into a fixed table of URL paths, so that a request can only ever
 * get one of these files: path traversal is impossible. `null` when it has not been built.
 */
export function loadAssets(directory: string): Map<string, Asset> | null {
  if (!existsSync(join(directory, 'index.html'))) {
    return null;
  }
  const assets = new Map<string, Asset>();
  for (const name of readdirSync(directory, {recursive: true, encoding: 'utf8'})) {
    const path = join(directory, name);
    const type = TYPES[extname(name)];
    if (type !== undefined && statSync(path).isFile()) {
      const url = `/${relative(directory, path).split(sep).join('/')}`;
      assets.set(url, {body: readFileSync(path), type});
    }
  }
  return assets;
}

const PLACEHOLDER = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Catón AI</title></head>
<body><h1>Catón AI</h1><p>The web interface has not been built yet. Run
<code>npm run build -w @caton-ai/web</code> and restart <code>caton serve</code>.</p></body></html>
`;

/** What is served while the interface has not been built. */
export const placeholderAssets: ReadonlyMap<string, Asset> = new Map([
  ['/index.html', {body: Buffer.from(PLACEHOLDER), type: TYPES['.html'] ?? 'text/html'}],
]);
