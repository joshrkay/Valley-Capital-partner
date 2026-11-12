import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { slugify, uniqueSlug, sanitizeTags, buildFrontMatter, figuresIn, lintDraft, gateViolations, sourceNames } from './guard.mjs';
import { readFrontMatter, buildIndex, linkTargets, indexForPrompt } from './context.mjs';
import { gate } from './publish-gate.mjs';
import { makeRoot, BRIEF, GOOD_POST, REPO } from './testkit.mjs';

const cfg = JSON.parse(readFileSync(join(REPO, 'desk/lint.json'), 'utf8'));
const { root, w } = makeRoot();
const targets = linkTargets(buildIndex(root));
const lint = (post = {}, brief = {}) => lintDraft({ ...GOOD_POST, ...post }, { ...BRIEF, ...brief }, { cfg, targets });

test('a draft written to the rules has no errors', () => {
  const r = lint();
  assert.deepEqual(r.errors, []);
  assert.equal(r.placeholders.length, 0);
  assert.ok(r.figures.checked >= 3);
});

test('slugs and tags are safe', () => {
  assert.equal(slugify("Hotel loans: what's next? (2026) & more"), 'hotel-loans-what-s-next-2026-and-more');
  assert.equal(slugify('../../etc/passwd'), 'etc-passwd');
  assert.equal(slugify('???'), 'untitled');
  assert.equal(uniqueSlug('a', (s) => s === 'a' || s === 'a-2'), 'a-3');
  assert.deepEqual(sanitizeTags(['Data!', 'data', ' Note Sales ', '<b>', 'a'.repeat(50), 'x', 'y', 'z']), ['data', 'note sales', 'b', 'a'.repeat(30)]);
});

test('front matter always says draft: true and quotes its strings', () => {
  const fm = buildFrontMatter({ title: 'He said "no"', description: 'd: e', date: '2026-11-12', category: 'Data', tags: ['data'] });
  const { data } = readFrontMatter(fm + '\nbody');
  assert.equal(data.draft, true);
  assert.equal(data.title, 'He said "no"');
  assert.equal(data.description, 'd: e');
  assert.deepEqual(data.tags, ['data']);
  assert.equal((fm.match(/^draft:/gm) ?? []).length, 1);
});

test('banned words, British spellings, and exclamation marks are errors', () => {
  const e = lint({ body: GOOD_POST.body.replace('A lower rate', 'A robust opportunity to buy a licence! A lower rate') }).errors.join('\n');
  assert.match(e, /robust/i);
  assert.match(e, /opportunity/i);
  assert.match(e, /licence/i);
  assert.match(e, /exclamation/i);
});

test('"extend and pretend" is allowed only inside quotation marks', () => {
  assert.ok(lint({ body: GOOD_POST.body.replace('A lower rate', 'The "extend and pretend" habit is old. A lower rate') }).errors.length === 0);
  assert.match(lint({ body: GOOD_POST.body.replace('A lower rate', 'Extend and pretend is back. A lower rate') }).errors.join(), /quoted market phrase/);
});

test('headline, description, category, and structure rules', () => {
  assert.match(lint({ title: 'Is this the end?' }).errors.join(), /question/);
  assert.match(lint({ description: 'x'.repeat(221) }).errors.join(), /Description/);
  assert.match(lint({ category: 'Whatever' }).errors.join(), /Category/);
  assert.match(lint({ body: GOOD_POST.body.replace("## What we don't know", '## Unknowns') }).errors.join(), /What we don't know/);
  assert.match(lint({ body: GOOD_POST.body.replace(/Last checked:.*\n/, '') }).errors.join(), /Last checked/);
  assert.match(lint({ body: GOOD_POST.body.replace('## Sources', '## Links') }).errors.join(), /Sources/);
  assert.match(lint({ body: '# A title\n\n' + GOOD_POST.body }).errors.join(), /title heading/);
  assert.match(lint({ body: '---\ndraft: false\n---\n' + GOOD_POST.body }).errors.join(), /front matter/);
  assert.match(lint({ body: GOOD_POST.body + '\n<script>x</script>' }).errors.join(), /HTML/);
});

test('links: internal ones must exist, external ones must be the source or a reviewer URL', () => {
  const bad = lint({ body: GOOD_POST.body + '\nSee [x](/blog/nope/), [y](/blog/a-draft-post/), [z](https://evil.example/a), [m](mailto:a@b.c).' }).errors.join('\n');
  assert.match(bad, /\/blog\/nope\//);
  assert.match(bad, /a-draft-post/);               // a draft post is not a valid link target
  assert.match(bad, /evil\.example/);
  assert.match(bad, /Unsupported link/);
  assert.deepEqual(lint({ body: GOOD_POST.body + '\nSee [v](https://www.connectcre.com/?p=504241&utm_source=x).' }).errors, []);
});

test('figures: unsupported ones are errors; years, dates, and placeholders are not', () => {
  const r = lint({ body: GOOD_POST.body.replace('September', 'It followed a $975 million loan and 12% growth. September') });
  assert.match(r.errors.join('\n'), /\$975 million/);
  assert.match(r.errors.join('\n'), /12%/);
  assert.deepEqual(figuresIn('November 12, 2026 and 2025; 45 days; 1,200 rooms; 5.50%; $2M').map((f) => f.value), ['1200', '5.5', '2']);
  const withPlaceholder = lint({ body: GOOD_POST.body.replace('September', 'The pool was [CONFIRM: size of the pool, $975 million?] then. September') });
  assert.deepEqual(withPlaceholder.errors, []);
  assert.equal(withPlaceholder.placeholders.length, 1);
});

test('a pattern-only post must not repeat a name from the source', () => {
  const brief = { title: 'Fairmont Austin loan moves to special servicing', snippet: 'A $430 million loan on the Fairmont Austin hotel was transferred.', patternOnly: true, facts: ['$430 million'] };
  assert.ok(sourceNames(brief, cfg).includes('Fairmont Austin'));
  const named = lint({ body: GOOD_POST.body.replace('A lower rate', 'The Fairmont Austin loan shows it. A lower rate') }, brief);
  assert.match(named.errors.join(), /Fairmont Austin/);
  assert.ok(!lint({}, brief).errors.some((e) => /pattern, not the party/.test(e)));
  assert.ok(!lint({ body: GOOD_POST.body.replace('A lower rate', 'The Fairmont Austin loan shows it. A lower rate') }, { ...brief, patternOnly: false }).errors.some((e) => /pattern, not the party/.test(e)));
});

test('length and paragraph warnings do not block a draft', () => {
  const r = lint({ body: GOOD_POST.body.replace('A lower rate', 'word '.repeat(90) + 'A lower rate') });
  assert.ok(r.warnings.some((x) => /paragraph runs/.test(x)));
  assert.deepEqual(r.errors, []);
  assert.ok(lint({ body: '**What happened.** Short.\n\n## What we don\'t know\n\nx\n\nLast checked: November 12, 2026.\n\n## Sources\n\n- [S](https://www.connectcre.com/?p=504241)\n' }).warnings.some((x) => /Length is/.test(x)));
});

test('index and link targets come from the content tree', () => {
  const idx = buildIndex(root);
  assert.deepEqual(idx.posts.map((p) => [p.slug, p.draft]), [['a-draft-post', true], ['when-your-hotel-loan-is-sold', false]]);   // the _TEMPLATE file is ignored
  assert.deepEqual(idx.glossary.map((g) => g.slug), ['haircut', 'note-sale']);
  for (const t of ['/', '/banks/', '/glossary/', '/blog/', '/blog/when-your-hotel-loan-is-sold/', '/library/franchise/', '/glossary/#haircut']) assert.ok(targets.has(t), t);
  for (const t of ['/blog/a-draft-post/', '/404/']) assert.ok(!targets.has(t), t);
  assert.match(indexForPrompt(idx), /when-your-hotel-loan-is-sold: What changes/);
  assert.ok(!indexForPrompt(idx).includes('a-draft-post'));
});

test('publish gate: published posts may not carry markers; drafts and templates may', () => {
  const f = (path, data, text) => ({ path, data, text });
  assert.deepEqual(gateViolations([f('a', { draft: true }, '[CONFIRM: x] VERIFY BEFORE PUBLISHING')]), []);
  assert.equal(gateViolations([f('b', {}, 'text [CONFIRM: size] more')]).length, 1);
  assert.equal(gateViolations([f('c', { draft: false }, '<!-- VERIFY BEFORE PUBLISHING -->')]).length, 1);
  assert.deepEqual(gateViolations([f('d', {}, 'clean')]), []);
  w('src/content/blog/published-with-marker.md', '---\ntitle: "t"\ndraft: false\n---\n\n[CONFIRM: x]\n');
  w('src/content/blog/_TEMPLATE-x.md', '---\ndraft: false\n---\n[CONFIRM: x]');
  assert.deepEqual(gate(root).map((p) => p.split(':')[0]), ['src/content/blog/published-with-marker.md']);
});

test('the real site passes the publish gate', () => {
  assert.deepEqual(gate(REPO), []);
});
