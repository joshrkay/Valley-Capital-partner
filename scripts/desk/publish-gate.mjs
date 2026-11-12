// Fails the build if a published post still carries an unresolved [CONFIRM: ...] or "VERIFY BEFORE PUBLISHING" marker.
// Draft posts (draft: true) and template files (names starting with "_") are ignored.
//   node scripts/desk/publish-gate.mjs
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFrontMatter } from './context.mjs';
import { gateViolations } from './guard.mjs';

export function gate(root) {
  const dir = join(root, 'src/content/blog');
  const files = existsSync(dir)
    ? readdirSync(dir).filter((f) => f.endsWith('.md') && !f.startsWith('_')).map((f) => {
        const text = readFileSync(join(dir, f), 'utf8');
        return { path: `src/content/blog/${f}`, data: readFrontMatter(text).data, text };
      })
    : [];
  return gateViolations(files);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const problems = gate(root);
  if (problems.length) {
    console.error('Publish gate: a post marked for publishing is not ready.\n' + problems.map((p) => '  - ' + p).join('\n'));
    process.exitCode = 1;
  } else console.log('Publish gate: no unresolved markers in published posts.');
}
