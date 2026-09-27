import {readFileSync} from 'node:fs';

// The server's Content Security Policy blocks inline scripts and styles: a build that emits one
// would show a blank page. Fail the build instead.

const html = readFileSync(new URL('../packages/web/dist/index.html', import.meta.url), 'utf8');
const inlineScript = /<script(?![^>]*\bsrc=)[^>]*>/iu.test(html);
const inlineStyle = /<style\b|\sstyle=/iu.test(html);

if (inlineScript || inlineStyle) {
  process.stderr.write('The built index.html has inline scripts or styles, which the CSP blocks\n');
  process.exitCode = 1;
}
