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
  snippet: 'Trepp said the lodging delinquency rate fell 24 basis points to 5.94% in October.', flags: [], lane: 'timely', angle: 'What the rate does and does not show.',
  why: '', patternOnly: false, related: [], facts: ['September was 6.18%.'], allowedUrls: ['https://www.connectcre.com/?p=504241'],
};

export const GOOD_BODY = `**What happened.** Trepp reported that its lodging delinquency rate fell 24 basis points to 5.94% in October, according to [Connect CRE](https://www.connectcre.com/?p=504241). September's reading was 6.18%. A lower rate is welcome news for anyone who holds hotel loans, but it answers a narrower question than it appears to, and the gap between the two is where lenders get into trouble.

## What the rate measures

A delinquency rate is a count of loans in a defined pool that are behind on payments or in another listed state, weighted by balance. It describes the pool, not the hotels inside it. The pool here is hotel loans packaged into commercial mortgage-backed securities. That leaves out loans a bank holds on its own books, which is where many community-bank hotel loans sit, and it leaves out every loan that was never securitized.

Because the rate is weighted by balance, a handful of large loans can move it. When one large loan returns to current status, the rate falls even if the other loans are no better off. When one large loan misses a payment, the rate rises. A change of 24 basis points tells you which way the pool moved this month. It does not tell you whether the typical hotel is healthier.

## How a loan leaves the count without being repaid

A loan stops counting as delinquent when it becomes current, and there are several ways that can happen. The borrower can catch up on missed payments. The loan can be paid off at maturity or refinanced. Or the loan can be extended or modified, which resets its status without reducing the debt.

The third route matters most to a lender, because it moves the problem forward in time instead of solving it. A [note sale](/glossary/#note-sale) is another exit: the loan leaves the lender's book, and often the pool, but the hotel's condition has not changed at all.

**Illustration (invented numbers):** Suppose a pool holds 100 loans of equal size. Ten are delinquent, so the rate is 10%. Over a month, three of the ten are extended for a year and one new loan misses a payment. Eight are now delinquent and the rate reads 8%, a fall of two points. But the three extended loans still carry the same debt, the same hotel, and the same weak cash flow. The pool looks better on paper and is not much safer.

## What to check in your own portfolio

- Whether your hotel loans sit inside the pool the publisher measures, or outside it.
- Which definition of delinquent your own reporting uses, and whether it counts loans past maturity that are still paying.
- When each loan matures, since a maturity is when an extension decision arrives.
- What a [haircut](/glossary/#haircut) on a sale would do to your reserves, if a sale is under consideration.

## Quoting the number

Keep the measure, the publisher, and the month together. "Trepp's lodging delinquency rate was 5.94% in October" can be checked. "Hotel delinquencies are falling" cannot. Do not set one publisher's rate beside another's until you have read the definitions behind each.

## What we don't know

We have not seen Trepp's methodology note, and the rate will change with the next report. We also do not know how many of the loans that left the count were extended rather than repaid.

Last checked: November 12, 2026.

## Sources

- Trepp lodging delinquency, October 2026, via [Connect CRE](https://www.connectcre.com/?p=504241)
`;

export const GOOD_POST = { title: 'Lodging delinquency eases in October', description: 'Trepp\'s lodging delinquency rate fell in October. What a lower rate does and does not show a lender.', category: 'Data', tags: ['data', 'delinquency'], body: GOOD_BODY, confirm_items: [] };
