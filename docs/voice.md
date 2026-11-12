# Voice guide

**Status: draft v1.** Built from the site's existing copy. Not yet tested against how peers write (research in progress) and not yet confirmed by a principal. Open decisions are at the bottom.

**Readers of this file:** whoever writes or reviews a post, and the drafting agent that produces first drafts.

## In one line

A calm, exact colleague who has read the whole loan file and has no interest in alarming anyone.

## Who we write for

Bank special-assets officers, special servicers, receivers and their counsel, and hotel owners in trouble. Many are under pressure. Some are about to lose a hotel. Write so any of them could read the post over a colleague's shoulder.

## Three traits

**Plain.** Short sentences, one idea to a paragraph (under about 70 words). Define a term on first use with a glossary link, then use it. Say "the lender" or "a special servicer", not "stakeholders".

**Exact.** Say what happened, who says so, and when. Put a source link on every figure. Say what is not known. Name the document (the franchise agreement, the loan tape), not the mood.

**Even-handed.** Set out the options with their costs, including the ones that do not involve us. A post never tells a lender to sell. The current posts already do this, and it is the main source of credibility. Keep it.

## Two registers

**Site pages** (home, Banks, Receivers, Firm): spare, declarative, a little cinematic. "A hotel is a business that never closes." "We buy the loan." Short lines, concrete nouns. "We" means what the firm does.

**Posts and the Library:** plain and balanced, no slogans. Every news post uses this register. Do not carry homepage lines into a post.

## Point of view

Facts are stated about roles in the third person: "a lender", "a receiver", "the servicer". "We" appears only in one labeled sentence of opinion ("Our view: ..."), at most one per post, and never about a specific loan or party. (Open decision 2.)

## Words

**Use** the glossary terms as written: note sale, discounted payoff, special servicer, workout, receiver, flag, improvement plan.

**Avoid:**
- Predatory images: vulture, bottom-fishing, fire sale, blood in the water, "distressed opportunity".
- Disaster images: wave, tsunami, meltdown, bloodbath of defaults, unless a source uses the word and we attribute it.
- Hype: game-changer, unlock, best-in-class, robust, "guaranteed", "proven track record" (unless documented).
- Jargon without a glossary link.

Call a loan non-performing, or a hotel struggling, only when a source says so. Describe people with respect: "an owner facing a maturity", not "a desperate owner".

## Style

- American English: license, favor, organize.
- Sentence-case headlines. No exclamation marks. No rhetorical questions in headlines.
- Figures as numerals: $265 million, 7%, November 12, 2026.
- Link a glossary term on first use only.

## Shape of a news note

**Headline:** states the fact or the question, not the shock. "What a maturity extension does to a hotel loan's classification."

1. **What happened.** Two sentences, sourced, with the date.
2. **Why it matters to a holder of a hotel loan.** Three to five sentences.
3. **What to check.** A short list.
4. **What we don't know.** One or two sentences.
5. **Sources.** Linked list.

Lengths: flash note 150 to 300 words; explainer 400 to 800; monthly data note about 500 with a table.

## Naming parties

React to the pattern, not the party.

- Default: do not name a borrower, hotel, bank or servicer as distressed.
- Exception: public record (a court filing, regulator release, rating-agency report, or a named press report), cleared by counsel, cited, and stated neutrally ("according to a court filing dated ..."). The exception needs counsel's sign-off before it is used. (Open decision 4.)
- Never write about an asset or party we have bid on, hold, or signed an NDA about.
- Never ride a bank failure, a closure, or layoffs for attention.

## Never

- Tips about specific loans, or "we would buy this".
- Predictions of specific outcomes. Use scenarios.
- Investment views on public companies.
- Anything learned from deal flow or under NDA.
- Legal, accounting, or regulatory advice. Keep the "General commentary only" footer.

## Before and after

Figures below are placeholders.

| Instead of | Write |
|---|---|
| "Hotel defaults are exploding, and smart money is circling." | "Hotel loans in CMBS pools were X% delinquent in [month], up from Y% a year earlier, according to [source]. Limited-service hotels were higher." |
| "Owner A is about to lose Hotel B." | "When a portfolio loan moves to special servicing ahead of maturity, three things usually follow: ..." |

## Decided

- **American English** (decided November 12, 2026). The existing site copy was converted to match. The license post now lives at `/blog/liquor-licenses-and-hotel-transfers/`, with a permanent redirect from the old address in `vercel.json`.
- **Byline: a named principal.** The name and role are still needed: no principal is named anywhere on the site yet. Until they are supplied, posts keep the firm name as the author. Once named:
  - set the default `author` in `src/content.config.ts`;
  - change the Article structured data in `src/pages/blog/[...slug].astro` so the author is a `Person` (it is an `Organization` today);
  - that person is the reviewer of record for every post, so they should read each one before it merges.

## Open decisions (need a principal)

1. **"Our view" sentence.** Allowed, or facts only.
2. **Named-party exception.** Needs counsel to set the rule once.
3. **The eight existing posts.** Put the principal's name on them too, or leave them under the firm name until they have been read. A name on a post says the person has read it.
