// Shared helpers for the tests: a throwaway site root, a fake Anthropic client, and a draft that should pass every check.
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function makeRoot() {
  const root = mkdtempSync(join(tmpdir(), 'deskroot-'));
  const w = (rel, text) => { mkdirSync(dirname(join(root, rel)), { recursive: true }); writeFileSync(join(root, rel), text); };
  for (const f of ['desk/models.json', 'desk/lint.json', 'docs/voice.md']) { mkdirSync(dirname(join(root, f)), { recursive: true }); copyFileSync(join(REPO, f), join(root, f)); }
  w('src/content/blog/when-your-hotel-loan-is-sold.md', '---\ntitle: "What changes when your hotel loan is sold"\ndescription: "d"\ndate: 2026-11-12\ncategory: "For owners"\ntags: ["owners"]\n---\n\nBody\n');
  w('src/content/blog/a-draft-post.md', '---\ntitle: "A draft"\ndescription: "d"\ndate: 2026-11-12\ndraft: true\n---\n\nBody\n');
  w('src/content/blog/_TEMPLATE.md', '---\ntitle: "template"\n---\n');
  w('src/content/glossary/note-sale.md', '---\nterm: "Note sale"\n---\n\nx\n');
  w('src/content/glossary/haircut.md', '---\nterm: "Haircut"\n---\n\nx\n');
  w('src/content/library/franchise.md', '---\ntitle: "The franchise"\ndescription: "d"\ntopic: "Franchise"\n---\n\nx\n');
  for (const p of ['index', 'banks/index', 'glossary', 'blog/index', 'blog/[...slug]', '404']) w(`src/pages/${p}.astro`, '');
  return { root, w };
}

// replies: a list used in order (the last one repeats). Each is a response object, an Error to throw, or a function of the request.
export function fakeClient(replies) {
  const calls = [];
  let i = 0;
  const next = async (params, kind) => {
    calls.push({ kind, params });
    const r = replies[Math.min(i++, replies.length - 1)];
    if (r instanceof Error) throw r;
    return typeof r === 'function' ? r(params) : r;
  };
  return { calls, messages: { create: (p) => next(p, 'messages') }, beta: { messages: { create: (p) => next(p, 'beta') } } };
}

export const reply = (obj, extra = {}) => ({ content: [{ type: 'text', text: JSON.stringify(obj) }], stop_reason: 'end_turn', usage: { input_tokens: 1000, output_tokens: 500 }, model: 'fake-model', ...extra });

export const BRIEF = {
  title: 'Lodging delinquency eases in October', sourceName: 'Connect CRE', sourceUrl: 'https://www.connectcre.com/?p=504241', sourceDate: '2026-11-05',
  snippet: 'Trepp said the lodging delinquency rate fell 24 basis points to 5.94% in October.', flags: [], lane: 'flash', angle: 'What the rate does and does not show.',
  why: '', patternOnly: false, related: [], facts: ['September was 6.18%.'], allowedUrls: ['https://www.connectcre.com/?p=504241'],
};

export const GOOD_BODY = `**What happened.** Trepp reported that its lodging delinquency rate fell 24 basis points to 5.94% in October, according to [Connect CRE](https://www.connectcre.com/?p=504241). September's reading was 6.18%.

## Why it matters to a holder of a hotel loan

A lower rate does not by itself show that the underlying loans have been resolved. A loan that is extended or modified can leave the delinquent count without having been repaid.

For a lender, the useful comparison is between this reading and the status of its own hotel loans, which are not part of securitized data. A [haircut](/glossary/#haircut) taken on a sale is a different measure again, and a [note sale](/glossary/#note-sale) changes who holds the loan, not what the documents say.

Anyone quoting the number should keep the measure, the publisher, and the month together, and should not set it beside another publisher's rate without checking the definitions behind each one.

## What to check

- Whether your own hotel loans are inside the pool Trepp measures.
- Which definition of delinquent your own reporting uses.
- When each loan's maturity date falls.

## What we don't know

We have not seen Trepp's methodology note, and the rate will change with the next report.

Last checked: November 12, 2026.

## Sources

- Trepp lodging delinquency, October 2026, via [Connect CRE](https://www.connectcre.com/?p=504241)
`;

export const GOOD_POST = { title: 'Lodging delinquency eases in October', description: 'Trepp\'s lodging delinquency rate fell in October. What a lower rate does and does not show a lender.', category: 'Data', tags: ['data', 'delinquency'], body: GOOD_BODY, confirm_items: [] };
