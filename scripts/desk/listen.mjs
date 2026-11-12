// News desk listeners. Fetches the sources in desk/sources.json, drops what it has seen, scores the rest, and writes a sheet.
//
//   node scripts/desk/listen.mjs              daily run: writes desk/out/candidates.{md,json} and summary.json, updates desk/state/seen.json
//   node scripts/desk/listen.mjs --check      test every enabled source and print what it returned (no state, no files)
//   node scripts/desk/listen.mjs --dry-run    print the sheet, change nothing
//
// Options: --out <dir> --state <file> --sources <file> --keywords <file> --calendar <file> --since <days> --now <iso date>
// Exit code: 0 if at least one source answered, 1 if none did (or, with --check, if any source failed).
// Stores only titles, links, dates, and snippets of 280 characters or less. It never keeps article text.
import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseFeed, parseFederalRegister, looksLikeFeed, compileKeywords, evaluate, itemKey, dueSoon, renderSheet } from './lib.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TIMEOUT_MS = 20000;
const PRUNE_DAYS = 120;
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

function parseArgs(argv) {
  const o = { check: false, dryRun: false, out: 'desk/out', state: 'desk/state/seen.json', sources: 'desk/sources.json', keywords: 'desk/keywords.json', calendar: 'desk/calendar.json', since: 3, now: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--check') o.check = true;
    else if (a === '--dry-run') o.dryRun = true;
    else if (['--out', '--state', '--sources', '--keywords', '--calendar', '--now'].includes(a)) o[a.slice(2)] = argv[++i];
    else if (a === '--since') o.since = Number(argv[++i]);
    else throw new Error(`unknown option ${a}`);
  }
  return o;
}

async function fetchText(url, headers) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS), redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function fetchSource(source, contact) {
  const headers = { 'User-Agent': contact ? `news-desk/0.1 (${contact})` : 'news-desk/0.1', Accept: 'application/rss+xml, application/atom+xml, application/xml, application/json, text/xml;q=0.9, */*;q=0.5' };
  if (source.requiresContact && !contact) throw new Error('needs DESK_CONTACT');
  const body = await fetchText(source.url, headers);
  if (source.type === 'federal-register') return parseFederalRegister(JSON.parse(body));
  if (source.type === 'rss') {
    if (!looksLikeFeed(body)) throw new Error('not a feed (got a web page?)');
    return parseFeed(body);
  }
  throw new Error(`unknown source type ${source.type}`);
}

export async function run(opts = {}) {
  const o = { ...parseArgs([]), ...opts };
  const abs = (p) => (p.startsWith('/') ? p : resolve(ROOT, p));
  const now = o.now ? new Date(o.now) : new Date();
  const date = now.toISOString().slice(0, 10);
  const contact = process.env.DESK_CONTACT || '';
  const sources = readJson(abs(o.sources)).sources.filter((s) => s.enabled);
  const ck = compileKeywords(readJson(abs(o.keywords)));
  const calendar = existsSync(abs(o.calendar)) ? readJson(abs(o.calendar)) : { entries: [] };

  // 1. Fetch, one source at a time and with a pause, so no host is hit hard.
  const results = [];
  for (const s of sources) {
    try {
      const items = await fetchSource(s, contact);
      results.push({ source: s, items, error: null });
    } catch (e) {
      results.push({ source: s, items: [], error: String(e?.cause?.code || e?.message || e).slice(0, 80) });
    }
    await new Promise((r) => setTimeout(r, o.pauseMs ?? 300));
  }
  const failed = results.filter((r) => r.error).map((r) => ({ name: r.source.name, error: r.error }));
  const ok = results.filter((r) => !r.error);

  if (o.check) {
    for (const r of results) {
      const newest = r.items.map((i) => i.published).filter(Boolean).sort().pop();
      console.log(`${r.error ? 'FAIL' : 'ok  '}  ${r.source.name.padEnd(28)} ${r.error ? r.error : `${r.items.length} items, newest ${newest ? newest.slice(0, 10) : 'n/a'}`}`);
    }
    return { exitCode: failed.length ? 1 : 0, failed };
  }

  // 2. Dedupe against what earlier runs saw, drop old items, score what is left.
  const statePath = abs(o.state);
  const state = existsSync(statePath) ? readJson(statePath) : { version: 1, items: {} };
  const cutoff = now.valueOf() - o.since * 86400000;
  const counts = { fetched: 0, duplicates: 0, belowThreshold: 0, tooOld: 0, sourcesOk: ok.length };
  const candidates = [];
  for (const r of ok) {
    for (const item of r.items) {
      counts.fetched++;
      const key = itemKey(item, r.source.id);
      if (state.items[key]) { counts.duplicates++; continue; }
      state.items[key] = date;                                   // seen, whatever the score
      if (item.published && new Date(item.published).valueOf() < cutoff) { counts.tooOld++; continue; }
      const ev = evaluate(item, r.source, ck);
      if (ev.score < ck.threshold) { counts.belowThreshold++; continue; }
      candidates.push({ ...item, ...ev, sourceId: r.source.id, sourceName: r.source.name, key });
    }
  }
  candidates.sort((a, b) => b.score - a.score || String(b.published).localeCompare(String(a.published)));
  const top = candidates.slice(0, ck.maxCandidates);
  for (const [k, d] of Object.entries(state.items)) if (now.valueOf() - new Date(d).valueOf() > PRUNE_DAYS * 86400000) delete state.items[k];

  const due = dueSoon(calendar, now, 7);
  const sheet = renderSheet({ date, candidates: top, due, failed, counts, flagNotes: ck.riskNotes });
  const summary = { date, candidates: top.length, due: due.length, opensToday: due.filter((d) => d.opensToday).length, failed: failed.length };

  if (o.dryRun) { console.log(sheet); return { exitCode: ok.length || !sources.length ? 0 : 1, summary, sheet }; }

  // 3. Write the sheet and the state. The state is written last, so a crash earlier re-reports instead of losing items.
  const outDir = abs(o.out);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, 'candidates.md'), sheet);
  writeFileSync(resolve(outDir, 'candidates.json'), JSON.stringify({ date, candidates: top, due, failed }, null, 2));
  writeFileSync(resolve(outDir, 'summary.json'), JSON.stringify(summary));
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath + '.tmp', JSON.stringify(state));
  renameSync(statePath + '.tmp', statePath);
  console.log(`news desk ${date}: ${top.length} candidate(s), ${due.length} release window(s), ${failed.length} source(s) failed, ${counts.duplicates} already seen`);
  return { exitCode: ok.length || !sources.length ? 0 : 1, summary };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run(parseArgs(process.argv.slice(2))).then((r) => { process.exitCode = r.exitCode; }, (e) => { console.error(e.message); process.exitCode = 1; });
}
