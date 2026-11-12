# News desk

A pipeline that turns news into draft posts for a person to review. Nothing in it publishes anything.

```
 listen            triage              draft                  a person            publish gate
 (code, daily) ->  (cheap model)  ->   (mid-tier model)  ->   reads and edits ->  (build refuses a post
 sources, dedupe,  which items         one draft, lint,        the draft pull       that still has a
 score, flags      deserve a post      one repair round,       request              [CONFIRM] or VERIFY note)
                                       draft pull request
```

- **Listen** (`scripts/desk/listen.mjs`): reads the sources in `desk/sources.json`, drops what it has seen, scores the rest, flags risks, lists expected data releases from `desk/calendar.json`, and opens one GitHub issue a day.
- **Triage** (`scripts/desk/triage.mjs`): a small model reads the day's candidates and recommends up to two, with a lane, an angle, and the facts a reviewer must copy from the source first. Advice only. It runs inside the daily workflow when the `ANTHROPIC_API_KEY` secret exists.
- **Draft** (`scripts/desk/draft.mjs`, workflow "News desk draft"): you pick a candidate and paste the facts. A mid-tier model writes one first draft under `docs/voice.md`. The script, not the model, writes the front matter (always `draft: true`) and checks the body. The result goes up as a draft pull request.
- **Publish gate** (`scripts/desk/publish-gate.mjs`, run first by `npm run build`): fails the build if a post that is not a draft still has a `[CONFIRM: ...]` placeholder or the "VERIFY BEFORE PUBLISHING" note. Drafts and `_TEMPLATE` files are ignored.

## Status: read this first

- **Every source address is unverified.** The publishers could not be reached from the environment where the listeners were written. Run `npm run desk:check` from a machine with open internet.
- **The model stages were tested with a fake client and a local stand-in server, never with the live API.** The tests prove the request the real SDK builds (endpoint, headers, effort, JSON-schema format, fallback header), the validation of what comes back, and every check. They do not prove how the models word things. The prompts will need tuning against real output. Read the first few drafts as a test of the prompts, not only of the news.
- **The calendar is inferred** from one or two observed release dates each.

## Setting it up (in this order)

1. Merge. Nothing runs yet.
2. Run **News desk listeners** by hand (Actions, Run workflow). Read the issue it opens and its failed-sources note. Fix `desk/sources.json`.
3. Set the repository variable `DESK_ENABLED` to `true` (Settings, Secrets and variables, Actions, Variables). The daily schedule starts.
4. For triage and drafting, add the repository secret `ANTHROPIC_API_KEY` (an Anthropic API key). Without it the listeners still work and triage is skipped.
5. For the draft workflow to open pull requests, turn on Settings, Actions, General, "Allow GitHub Actions to create and approve pull requests". If it is off, the branch is still pushed and the log says how to open the pull request by hand.
6. Optional: `DESK_CONTACT` secret, only if you enable SEC EDGAR.

## Using it

1. Read the day's issue. Under "Triage" it recommends candidates and lists the facts to copy from each source.
2. Open the source. Copy the facts it asks for.
3. Actions, **News desk draft**, Run workflow: enter the candidate number and the facts separated by `|`. Leave the lane on `auto` unless you disagree with triage.
4. Read the draft pull request. It lists what failed, what is a placeholder, which names to confirm, and what a person must do.
5. Edit the file, resolve every `[CONFIRM: ...]`, delete the VERIFY note, check each figure at its source, and have a principal read it. Then set `draft: false` and merge. The publish gate will stop you if you forgot something.

From a laptop: `ANTHROPIC_API_KEY=... npm run desk:triage`, then `npm run desk:draft -- --candidate 2 --facts "fact one | fact two"`. Both work on the sheet in `desk/out/`.

## What the checks catch

The drafter is told to use only the facts in its brief and to write `[CONFIRM: ...]` where it lacks one. The script then checks, in code:

- **Banned words and British spellings** from the voice guide, "extend and pretend" outside quotation marks, exclamation marks, a question in the headline, HTML, images, front matter or a title heading in the body.
- **Invented figures.** Every figure with a `$`, `%`, unit, decimal, or three or more digits must appear in the source title or snippet, the source name or date, or the facts you pasted.
- **Invented links.** Internal links must exist and must not point at a draft. External links must be the source or a URL in your facts.
- **Names.** A post marked pattern-only may not repeat a capitalized name from the source (publishers, agencies, and places are exempt). Every other capitalized name is listed for the reviewer. This is a heuristic: it misses single-word names and can flag harmless ones.
- **Structure.** "What we don't know", "Sources", and "Last checked" must be present. Length and long paragraphs are warnings.

A draft that fails gets one repair round with the failures quoted back to the model. If it still fails, it is written anyway as a draft, with the failures at the top of the file and in the pull request, so a person can fix it.

## Safeguards

- **No publishing path.** The model returns JSON. The script builds the file, always `draft: true`, at a path it computes from a sanitized slug. The model has no tools and cannot write files, call the network, or open pull requests.
- **Untrusted text.** Feed titles and snippets go to the models fenced as data with `<` escaped, and the prompts say to ignore instructions inside them. Output from the models is validated and made inert before it appears in an issue or pull request.
- **Workflow inputs** reach the shell only through environment variables.
- **Supply chain.** The only new dependency is the official `@anthropic-ai/sdk`. The workflows install with `--ignore-scripts` and run `npm audit signatures`.
- **Keep as little as possible.** The listeners keep a title, link, date, and a 280-character snippet. No article text is stored.

## Cost

Set in `desk/models.json`. Triage runs on `claude-haiku-5-5` at low effort; drafting on `claude-sonnet-5-5` at high effort, with the server-side fallback enabled. **These figures are estimates from prompt size, not measurements:** about a fifth of a cent for a day's triage, and a few cents for a draft (a repair round roughly doubles it). The Anthropic API reference's own default is `claude-opus-5-5`, about twice the Sonnet price; set `draft.model` to it if drafts need more. Each pull request shows its own token count and estimated cost.

## Changing it

- **Sources:** `desk/sources.json`. **Relevance and risk flags:** `desk/keywords.json`. **Release calendar:** `desk/calendar.json`.
- **Models, effort, repair rounds, number of picks:** `desk/models.json`.
- **House rules the code enforces:** `desk/lint.json` (banned words, spellings, categories, length ranges, names that may appear). Keep it in step with `docs/voice.md`.
- **Tests:** `npm run desk:test` (44 tests, no network, no key).

## Not done

- **Updating an existing post.** Triage can recommend it; drafting one is not automated. Edit the post and set its `updated:` date.
- **The monthly Hotel loan watch** is written from its template by hand. The calendar tells you when the data lands.
- **SEC EDGAR, CourtListener, Google Alerts, Hospitality Net, Hotel Online, and Bisnow** are listed but disabled until a feed address, account, or contact exists.
- **The listeners cannot read page text,** so they cannot check a number. Every figure still has to be opened at its source.
