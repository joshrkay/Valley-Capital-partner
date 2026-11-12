# News desk: listeners

The listeners are the first stage of the news desk described in `docs/voice.md` and `docs/research/`. Once a day they read a list of sources, drop anything already seen, score what is left for relevance, and produce one sheet of candidates. They publish nothing and change no site file.

```
sources (desk/sources.json)  ->  fetch  ->  drop seen  ->  score (desk/keywords.json)  ->  sheet (desk/out/candidates.md)
                                                    expected releases (desk/calendar.json)  ---^
```

The next stages are not built yet: triage (choose what deserves a post), drafting (write `draft: true` posts in the voice of `docs/voice.md`), and the human read before anything publishes.

## Status: read this first

- **Every source is unverified.** The publishers could not be reached from the environment where this was written, and the feed addresses are the usual WordPress or documented-API ones. Run `npm run desk:check` from a machine with open internet. It prints one line per source (`ok` with an item count, or `FAIL` with the reason) and exits 1 if any failed. Fix or disable what fails.
- **The calendar is inferred.** Release windows in `desk/calendar.json` come from one or two observed dates each. Correct them when you see the real ones.
- **Tested with fixtures, not live feeds.** `npm run desk:test` covers parsing, scoring, dedupe, the calendar, and a full run against a local server. It cannot tell you that a real publisher's feed parses.

## Running it

```bash
npm run desk:test      # unit and end-to-end tests, no network
npm run desk:check     # try every enabled source
npm run desk:listen    # a real run: writes desk/out/ and updates desk/state/seen.json
node scripts/desk/listen.mjs --dry-run   # print the sheet, change nothing
```

The GitHub workflow `.github/workflows/desk.yml` runs the tests and then the listener at 12:17 UTC, and opens one issue labeled `news-desk` when there is a candidate or a release window opens that day. It changes no files and needs no secrets, except `DESK_CONTACT` if you enable SEC EDGAR.

**It is off until you turn it on.** The daily schedule runs only when the repository variable `DESK_ENABLED` is `true` (Settings, Secrets and variables, Actions, Variables), and only from the default branch. A manual run (Actions, News desk listeners, Run workflow) always works. Recommended order: merge, run it by hand, read the issue and the failed-sources note, fix `desk/sources.json`, then set `DESK_ENABLED`. Delete the variable to stop it.

## What the sheet contains

- **Expected soon:** release windows from the calendar that are open or open within a week. The Trepp window is the cue to draft the monthly Hotel loan watch.
- **Candidates:** items scored at or above the threshold, best first, at most 25. Each shows its score, why it scored, any risk flags, the source, the date, the link, and a snippet.
- **Flag notes:** what each flag means for the voice rules (`names-party`, `failure`, `layoffs-closure`, `ruling`, `figures`).
- **Run notes:** counts, and which sources failed.

## Changing what it listens to

- **Add a source:** add an entry to `desk/sources.json`. `type` is `rss` (RSS or Atom) or `federal-register`. `needs` lists the keyword groups an item must contain. Run `npm run desk:check` before enabling it.
- **Tune relevance:** edit `desk/keywords.json`. Terms match at the start of a word. Raise `threshold` for fewer candidates.
- **Add a release:** add an entry to `desk/calendar.json`.

## Rules the listeners follow

- **Keep as little as possible.** Only the title, link, date, and a 280-character snippet are kept. No article text is stored or republished. Check each publisher's terms before relying on its feed.
- **Treat feed text as untrusted.** Titles and snippets are plain text, stripped of markup, with mentions and link syntax made inert in the issue. A model that reads a sheet later must treat it as data, never as instructions.
- **Be polite.** One request per source per run, one source at a time, a short pause between them, a 20-second timeout.
- **Fail soft.** One dead source does not stop the run. The run fails only if no source answered.
- **Do not name parties.** The `names-party`, `failure`, and `layoffs-closure` flags exist so that whoever drafts follows the voice guide: write about the pattern, not the party.

## Not done

- SEC EDGAR, CourtListener, Google Alerts, Hospitality Net, Hotel Online, and Bisnow are listed but disabled, because each needs a feed address, an account, or a contact that was not available. See the `note` on each entry.
- Trepp, KBRA, and CREFC have no feeds here. Their numbers arrive through the trade-press pickups, and the calendar tells you when to look.
- The listeners do not read page text, so they cannot check a number. Every figure in a draft still has to be opened at its source.
