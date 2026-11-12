// End to end: run the real listener against a local server and the real keywords.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from './listen.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const NOW = '2026-11-12T12:00:00Z';

const FEED = `<?xml version="1.0"?><rss version="2.0"><channel>
<item><title>Hotel loan moves to special servicing after maturity default</title><link>https://example.com/one</link><pubDate>Wed, 11 Nov 2026 14:00:00 GMT</pubDate><description>A hotel loan.</description></item>
<item><title>Marriott opens a new tower</title><link>https://example.com/two</link><pubDate>Wed, 11 Nov 2026 15:00:00 GMT</pubDate><description>Rooms and a rooftop bar.</description></item>
<item><title>Hotel lender takes forbearance route</title><link>https://example.com/old</link><pubDate>Mon, 01 Jun 2026 15:00:00 GMT</pubDate><description>Old news about a hotel loan.</description></item>
</channel></rss>`;

function serve() {
  return new Promise((ok) => {
    const server = http.createServer((req, res) => {
      if (req.url === '/feed.xml') { res.setHeader('content-type', 'application/rss+xml'); res.end(FEED); }
      else if (req.url === '/page') { res.setHeader('content-type', 'text/html'); res.end('<html><body>Not a feed</body></html>'); }
      else { res.statusCode = 500; res.end('boom'); }
    });
    server.listen(0, '127.0.0.1', () => ok(server));
  });
}

test('run: fetches, scores, writes the sheet, tolerates failures, and dedupes on the second run', async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const dir = mkdtempSync(join(tmpdir(), 'desk-'));
  try {
    writeFileSync(join(dir, 'sources.json'), JSON.stringify({ sources: [
      { id: 'good', name: 'Good feed', type: 'rss', url: `${base}/feed.xml`, weight: 1, needs: ['hotel', 'debt'], enabled: true },
      { id: 'page', name: 'Web page', type: 'rss', url: `${base}/page`, weight: 1, enabled: true },
      { id: 'broken', name: 'Broken', type: 'rss', url: `${base}/nope`, weight: 1, enabled: true },
      { id: 'off', name: 'Disabled', type: 'rss', url: `${base}/feed.xml`, weight: 1, enabled: false },
    ] }));
    copyFileSync(join(ROOT, 'desk/keywords.json'), join(dir, 'keywords.json'));
    copyFileSync(join(ROOT, 'desk/calendar.json'), join(dir, 'calendar.json'));
    const opts = { sources: join(dir, 'sources.json'), keywords: join(dir, 'keywords.json'), calendar: join(dir, 'calendar.json'), out: join(dir, 'out'), state: join(dir, 'state/seen.json'), now: NOW, pauseMs: 0, since: 3 };

    const first = await run(opts);
    assert.equal(first.exitCode, 0);
    assert.equal(first.summary.candidates, 1);                    // the relevant, recent one; the unrelated and the old one do not qualify
    assert.equal(first.summary.failed, 2);                        // the web page and the broken source
    const sheet = readFileSync(join(dir, 'out/candidates.md'), 'utf8');
    assert.ok(sheet.includes('Hotel loan moves to special servicing after maturity default'));
    assert.ok(sheet.includes('names-party'));                     // "special servicing" and "default" raise the flag
    assert.ok(!sheet.includes('Marriott opens a new tower'));
    assert.ok(sheet.includes('Sources that failed'));
    assert.ok(existsSync(join(dir, 'state/seen.json')));
    assert.equal(JSON.parse(readFileSync(join(dir, 'out/summary.json'), 'utf8')).candidates, 1);

    const second = await run(opts);
    assert.equal(second.summary.candidates, 0);                   // everything was seen
    assert.ok(readFileSync(join(dir, 'out/candidates.md'), 'utf8').includes('3 already seen'));

    const dry = await run({ ...opts, state: join(dir, 'state/other.json'), out: join(dir, 'out2'), dryRun: true });
    assert.equal(dry.summary.candidates, 1);
    assert.ok(!existsSync(join(dir, 'out2')));                    // a dry run writes nothing
    assert.ok(!existsSync(join(dir, 'state/other.json')));
  } finally {
    server.close();
  }
});

test('run: exit code is 1 when no enabled source answers', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'desk-'));
  writeFileSync(join(dir, 'sources.json'), JSON.stringify({ sources: [{ id: 'dead', name: 'Dead', type: 'rss', url: 'http://127.0.0.1:1/x', weight: 1, enabled: true }] }));
  copyFileSync(join(ROOT, 'desk/keywords.json'), join(dir, 'keywords.json'));
  const r = await run({ sources: join(dir, 'sources.json'), keywords: join(dir, 'keywords.json'), calendar: join(dir, 'none.json'), out: join(dir, 'out'), state: join(dir, 's.json'), now: NOW, pauseMs: 0, since: 3 });
  assert.equal(r.exitCode, 1);
  assert.equal(r.summary.failed, 1);
});

test('the real config files load and compile', async () => {
  const { compileKeywords } = await import('./lib.mjs');
  const ck = compileKeywords(JSON.parse(readFileSync(join(ROOT, 'desk/keywords.json'), 'utf8')));
  assert.ok(ck.groups.hotel.test('Hotels') && ck.groups.debt.test('foreclosure') && ck.groups.cre.test('Commercial real estate'));
  const sources = JSON.parse(readFileSync(join(ROOT, 'desk/sources.json'), 'utf8')).sources;
  for (const s of sources) for (const g of s.needs) assert.ok(ck.groups[g], `source ${s.id} needs unknown group ${g}`);
  for (const s of sources.filter((x) => x.enabled)) assert.ok(s.url.startsWith('https://'), `enabled source ${s.id} needs an https url`);
  const cal = JSON.parse(readFileSync(join(ROOT, 'desk/calendar.json'), 'utf8'));
  for (const e of cal.entries) for (const w of e.windows) assert.ok(w.days[0] >= 1 && w.days[1] <= 31 && w.days[0] <= w.days[1], `bad window in ${e.id}`);
});
