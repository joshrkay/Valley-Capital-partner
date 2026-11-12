import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFeed, looksLikeFeed, parseFederalRegister, cleanText, canonicalUrl, itemKey, compileKeywords, evaluate, dueSoon, renderSheet, defang } from './lib.mjs';

const RSS = `<?xml version="1.0"?><rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>Feed</title>
<item><title><![CDATA[Hotel loan moves to special servicing &amp; more]]></title><link>https://www.example.com/a?utm_source=x</link><pubDate>Wed, 11 Nov 2026 14:00:00 GMT</pubDate><description>&lt;p&gt;A &lt;b&gt;$100 million&lt;/b&gt; loan.&lt;/p&gt;</description><guid>g1</guid></item>
<item><title>Second</title><link>https://example.com/b</link><dc:date>2026-11-10T09:00:00Z</dc:date></item>
<item><description>No title, dropped</description></item>
</channel></rss>`;

const ATOM = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Atom item</title><link rel="self" href="https://x.com/self"/><link rel="alternate" href="https://x.com/real?a=1&amp;b=2"/><updated>2026-11-09T00:00:00Z</updated><summary type="html">&lt;p&gt;Snippet&lt;/p&gt;</summary><id>tag:x,1</id></entry></feed>`;

const KW = compileKeywords({
  threshold: 3,
  groups: { hotel: ['hotel', 'lodging'], debt: ['loan', 'delinquen', 'special servic'], cre: ['commercial real estate'] },
  risk: { 'names-party': ['\\bspecial servic'], figures: ['\\d+(\\.\\d+)?\\s?%'] },
  exclude: ['\\bgiveaway\\b'],
  riskNotes: { figures: 'Has figures.' },
});
const SRC = { id: 's', name: 'S', weight: 1, needs: ['hotel', 'debt'] };

test('parseFeed reads RSS: CDATA, escaped HTML, entities, Dublin Core dates; drops items without a title', () => {
  const items = parseFeed(RSS);
  assert.equal(items.length, 2);
  assert.equal(items[0].title, 'Hotel loan moves to special servicing & more');
  assert.equal(items[0].url, 'https://www.example.com/a?utm_source=x');
  assert.equal(items[0].published, '2026-11-11T14:00:00.000Z');
  assert.equal(items[0].summary, 'A $100 million loan.');
  assert.equal(items[1].published, '2026-11-10T09:00:00.000Z');
});

test('parseFeed reads Atom and prefers the alternate link', () => {
  const [item] = parseFeed(ATOM);
  assert.equal(item.title, 'Atom item');
  assert.equal(item.url, 'https://x.com/real?a=1&b=2');
  assert.equal(item.summary, 'Snippet');
  assert.equal(item.published, '2026-11-09T00:00:00.000Z');
});

test('an HTML page is not a feed', () => {
  assert.equal(looksLikeFeed('<!doctype html><html><body>hi</body></html>'), false);
  assert.equal(looksLikeFeed(RSS), true);
  assert.deepEqual(parseFeed('<html><body>hi</body></html>'), []);
});

test('Federal Register results are normalised and need a title and a link', () => {
  const items = parseFederalRegister({ results: [
    { title: 'Guidance on commercial real estate loans', html_url: 'https://www.federalregister.gov/d/2026-1', publication_date: '2026-11-10', abstract: '<p>About loans.</p>', document_number: '2026-1' },
    { title: 'No link' },
  ] });
  assert.equal(items.length, 1);
  assert.equal(items[0].summary, 'About loans.');
  assert.equal(items[0].published, '2026-11-10T00:00:00.000Z');
});

test('cleanText strips markup, control characters, and long text', () => {
  assert.equal(cleanText('<script>x</script> a  &lt;b&gt;bold&lt;/b&gt;\u0007 b'), 'x a bold b');
  assert.equal(cleanText('a < b and c > d'), 'a < b and c > d');
  assert.ok(cleanText('x'.repeat(500), 100).length <= 100);
});

test('the same article from two addresses gets one key', () => {
  const a = { url: 'https://WWW.Example.com/a/?utm_source=x&id=5#frag', title: 't' };
  const b = { url: 'https://example.com/a/?id=5', title: 't' };
  assert.equal(itemKey(a, 's'), itemKey(b, 's'));
  assert.notEqual(itemKey(a, 's'), itemKey({ url: 'https://example.com/a/?id=6', title: 't' }, 's'));
  assert.equal(canonicalUrl('not a url'), '');
  assert.equal(itemKey({ url: '', title: 'Same' }, 's1'), itemKey({ url: '', title: 'Same' }, 's1'));
});

test('evaluate: needs every group, title counts double, excluded text and missing groups score zero', () => {
  const hit = evaluate({ title: 'Hotel loan delinquency falls to 5.9%', summary: '' }, SRC, KW);
  assert.equal(hit.score, 5);
  assert.deepEqual(hit.flags, ['figures']);
  assert.equal(evaluate({ title: 'Marriott earnings', summary: 'occupancy rose' }, SRC, KW).score, 0);
  assert.equal(evaluate({ title: 'Giveaway: a hotel stay and a loan of a bike', summary: '' }, SRC, KW).score, 0);
  const weak = evaluate({ title: 'Quarterly update', summary: 'hotel and loan mentioned in passing' }, { ...SRC, weight: 0 }, KW);
  assert.equal(weak.score, 2);                                  // below the threshold of 3
  assert.ok(weak.score < KW.threshold);
  assert.deepEqual(evaluate({ title: 'Hotel loan', summary: 'special servicing' }, SRC, KW).flags, ['names-party']);
  assert.equal(evaluate({ title: 'Hotel loan', summary: '' }, { ...SRC, needs: ['nope'] }, KW).score, 0);
});

test('dueSoon: opens today, open now, opens soon, none, and across a month boundary', () => {
  const cal = { entries: [
    { id: 'm', name: 'Monthly', windows: [{ months: 'all', days: [1, 7] }], action: 'do', inferred: true },
    { id: 'q', name: 'Quarterly', windows: [{ months: [2, 5, 8, 11], days: [15, 30] }] },
  ] };
  const at = (iso) => dueSoon(cal, new Date(iso), 7);
  const dec1 = at('2026-12-01T12:00:00Z').find((d) => d.id === 'm');
  assert.deepEqual([dec1.openNow, dec1.opensToday, dec1.inDays], [true, true, 0]);
  const dec3 = at('2026-12-03T12:00:00Z').find((d) => d.id === 'm');
  assert.deepEqual([dec3.openNow, dec3.opensToday], [true, false]);
  const nov30 = at('2026-11-30T12:00:00Z').find((d) => d.id === 'm');
  assert.deepEqual([nov30.openNow, nov30.inDays], [false, 1]);
  assert.equal(at('2026-12-10T12:00:00Z').length, 0);
  const dec28 = at('2026-12-28T12:00:00Z').find((d) => d.id === 'm');
  assert.equal(dec28.inDays, 4);                                // January 1
  const q = at('2026-11-10T12:00:00Z').find((d) => d.id === 'q');
  assert.deepEqual([q.openNow, q.inDays], [false, 5]);
});

test('renderSheet makes untrusted text inert and lists flag notes', () => {
  const sheet = renderSheet({
    date: '2026-11-12',
    candidates: [{ title: 'Hello @everyone [click](http://evil.example) `x`', sourceName: 'S', published: '2026-11-12T00:00:00.000Z', url: 'https://example.com/a b>', summary: 'See @someone', score: 5, reasons: ['hotel (title)'], flags: ['figures'] }],
    due: [], failed: [{ name: 'Bad', error: 'HTTP 403' }],
    counts: { fetched: 3, sourcesOk: 1, duplicates: 1, belowThreshold: 1, tooOld: 0 },
    flagNotes: { figures: 'Has figures.' },
  });
  assert.ok(sheet.includes('@​everyone'));
  assert.ok(sheet.includes('\\[click\\]\\(http') || sheet.includes('\\[click\\](http'));
  assert.ok(!sheet.includes('[click]('));
  assert.ok(sheet.includes('https://example.com/ab'));
  assert.ok(sheet.includes('**figures**: Has figures.'));
  assert.ok(sheet.includes('Sources that failed: Bad (HTTP 403)'));
  assert.equal(defang('a@b'), 'a@​b');
});
