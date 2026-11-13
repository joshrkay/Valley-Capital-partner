// Lint existing posts against the house rules in desk/lint.json: length, filler, banned words, spelling, links, repetition.
//   node scripts/desk/lint-post.mjs                          every post that is not a template
//   node scripts/desk/lint-post.mjs src/content/blog/x.md    just these
// Prints one line per post with its word count, then the problems. Exit code 1 if any post has an error.
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFrontMatter, buildIndex, linkTargets, loadJson } from './context.mjs';
import { lintDraft } from './guard.mjs';

export function lintPosts(root, files) {
  const cfg = loadJson(root, 'desk/lint.json');
  const targets = linkTargets(buildIndex(root));
  const list = files?.length ? files : readdirSync(join(root, 'src/content/blog')).filter((f) => f.endsWith('.md') && !f.startsWith('_')).map((f) => join(root, 'src/content/blog', f));
  return list.map((file) => {
    const { data, body } = readFrontMatter(readFileSync(resolve(file), 'utf8'));
    const r = lintDraft({ title: data.title ?? '', description: data.description ?? '', category: data.category ?? '', body }, null, { cfg, targets });
    return { slug: basename(file).replace(/\.md$/, ''), draft: data.draft === true, ...r };
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const results = lintPosts(root, process.argv.slice(2));
  let bad = 0;
  for (const r of results) {
    if (r.errors.length) bad++;
    console.log(`${String(r.words).padStart(4)} words  ${r.errors.length ? 'FAIL' : 'ok  '}  ${r.draft ? 'draft    ' : 'published'}  ${r.slug}`);
    for (const e of r.errors) console.log(`        error:   ${e}`);
    for (const w of r.warnings) console.log(`        warning: ${w}`);
  }
  console.log(`\n${results.length} post(s) checked, ${bad} with errors.`);
  process.exitCode = bad ? 1 : 0;
}
