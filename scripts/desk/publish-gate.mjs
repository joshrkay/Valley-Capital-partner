// Fails the build if a published post still carries an unresolved [CONFIRM: ...] or "VERIFY BEFORE PUBLISHING" marker, or is outside the
// word range in desk/lint.json (500 to 800). Draft posts (draft: true) and template files (names starting with "_") are ignored.
//   node scripts/desk/publish-gate.mjs
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFrontMatter } from './context.mjs';
import { gateViolations } from './guard.mjs';

export function gate(root) {
  const dir = join(root, 'src/content/blog');
  const cfgPath = join(root, 'desk/lint.json');
  const cfg = existsSync(cfgPath) ? JSON.parse(readFileSync(cfgPath, 'utf8')) : {};
  const files = existsSync(dir)
    ? readdirSync(dir).filter((f) => f.endsWith('.md') && !f.startsWith('_')).map((f) => {
        const text = readFileSync(join(dir, f), 'utf8');
        const { data, body } = readFrontMatter(text);
        return { path: `src/content/blog/${f}`, data, text, body };
      })
    : [];
  return gateViolations(files, cfg);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const problems = gate(root);
  if (problems.length) {
    console.error('Publish gate: a post marked for publishing is not ready.\n' + problems.map((p) => '  - ' + p).join('\n'));
    process.exitCode = 1;
  } else console.log('Publish gate: published posts have no unresolved markers and are within the word range.');
}
