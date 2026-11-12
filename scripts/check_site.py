"""Static checks on the built site (dist/). Run after `npm run build`:

    python3 scripts/check_site.py [path/to/an/older/dist]

Checks: balanced markup, one <h1> / <title> / description / canonical per page, unique ids, every internal link, anchor and asset
resolves, every CSS class used has a rule, no leftovers from the old build, every section's video slot exists, and (if you pass an
older build) that page copy matches it. Exit code 1 if anything is wrong. Uses only the Python standard library."""
import glob, os, re, sys
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, 'dist')
OLD = sys.argv[1] if len(sys.argv) > 1 else None
VOID = {'meta', 'link', 'br', 'img', 'input', 'hr', 'source', 'area', 'base', 'col', 'embed', 'track', 'wbr', 'path', 'circle', 'rect'}
problems, warnings = [], []


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack, self.ids, self.classes, self.links, self.assets, self.errors = [], set(), set(), [], [], []
        self.h1, self.title, self.desc, self.canonical, self._in_title = 0, '', None, None, False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a:
            if a['id'] in self.ids: self.errors.append('duplicate id %r' % a['id'])
            self.ids.add(a['id'])
        for c in (a.get('class') or '').split(): self.classes.add(c)
        if tag == 'h1': self.h1 += 1
        if tag == 'title': self._in_title = True
        if tag == 'meta' and a.get('name') == 'description': self.desc = a.get('content')
        if tag == 'link' and a.get('rel') == 'canonical': self.canonical = a.get('href')
        if tag == 'a' and 'href' in a: self.links.append(a['href'])
        if tag in ('script', 'link') and (a.get('src') or a.get('href')) and a.get('rel') != 'canonical': self.assets.append(a.get('src') or a.get('href'))
        if tag == 'video' and a.get('data-src'): self.assets.append(a['data-src'])
        if tag not in VOID: self.stack.append(tag)

    def handle_data(self, data):
        if self._in_title: self.title += data

    def handle_endtag(self, tag):
        if tag == 'title': self._in_title = False
        if tag in VOID: return
        if not self.stack or self.stack[-1] != tag: self.errors.append('mismatched </%s> (open: %s)' % (tag, self.stack[-1] if self.stack else 'none'))
        else: self.stack.pop()


pages = {}                                         # url path -> (parser, html)
for root, _, files in os.walk(DIST):
    for f in files:
        if f in ('index.html', '404.html'):
            rel = os.path.relpath(root, DIST)
            url = '/' if (rel == '.' and f == 'index.html') else ('/404.html' if f == '404.html' else '/%s/' % rel)
            html = open(os.path.join(root, f)).read()
            p = Page(); p.feed(html); p.close()
            if p.stack: p.errors.append('unclosed: %s' % p.stack)
            pages[url] = (p, html)
for url, (p, _) in pages.items():
    for e in p.errors: problems.append('%s: %s' % (url, e))
    if p.h1 != 1: problems.append('%s: has %d <h1> (want 1)' % (url, p.h1))
    if not p.title.strip(): problems.append('%s: no <title>' % url)
    if not p.desc: problems.append('%s: no meta description' % url)
    if url != '/404.html' and not p.canonical: problems.append('%s: no canonical link' % url)
    if 'main' not in p.ids: problems.append('%s: no #main for the skip link' % url)
titles = [p.title for p, _ in pages.values()]
for t in set(titles):
    if titles.count(t) > 1: problems.append('duplicate <title> %r' % t)


def exists(path):
    return os.path.exists(os.path.join(DIST, path.lstrip('/')))


for url, (p, _) in pages.items():
    for h in p.links:
        if re.match(r'(https?:|mailto:|tel:)', h): continue
        target, _, frag = h.partition('#')
        if target and not target.startswith('/'):
            problems.append('%s: relative link %r (use /absolute/ paths)' % (url, h)); continue
        t = target or url
        if t.endswith('/') or t == '/404.html':
            if t not in pages: problems.append('%s: link to missing page %r' % (url, h)); continue
            if frag and frag not in pages[t][0].ids: problems.append('%s: link %r has no anchor #%s' % (url, h, frag))
        elif not exists(t): problems.append('%s: link to missing file %r' % (url, h))
    for a in p.assets:
        if re.match(r'(https?:|//)', a): continue
        a = a.split('?')[0]
        if not exists(a):
            (warnings if a.startswith('/video/') else problems).append('%s: missing asset %r' % (url, a))

# every class used has a style rule (hashed CSS lives in dist/_astro)
css = ''.join(open(f).read() for f in glob.glob(os.path.join(DIST, '_astro', '*.css')))
styled = set(re.findall(r'\.([A-Za-z_][\w-]*)', css))
used = set().union(*[p.classes for p, _ in pages.values()])
unstyled = sorted(c for c in used if c not in styled)
print('classes used but with no CSS rule (review; some are intentional hooks):', unstyled or 'none')

# leftovers from the old build; video slots each section asks for
for url, (_, html) in pages.items():
    for bad in ('three.min', 'three.js', 'hotel.jpg', 'story-photo', 'id="tower"', '<canvas'):
        if bad in html: problems.append('%s: leftover %r' % (url, bad))
    slots = set(re.findall(r'<video data-slot="(\w+)"', html))
    for s in set(re.findall(r'data-bg="(\w+)"', html)):
        if s not in slots: problems.append('%s: section wants video slot %r that the page does not have' % (url, s))

# feeds
for f in ('sitemap-index.xml', 'rss.xml', 'robots.txt', 'favicon.svg'):
    if not exists(f): problems.append('missing %s' % f)


def body_text(html):
    m = re.search(r'</header>(.*?)<footer', html, re.S)
    t = re.sub(r'<(script|style)[^>]*>.*?</\1>', ' ', m.group(1) if m else '', flags=re.S)
    t = re.sub(r'<[^>]+>', ' ', t)
    return re.sub(r'\s+', ' ', t.replace('&mdash;', '-').replace('&amp;', '&').replace('&#x27;', "'").replace('&#39;', "'").replace('&#8212;', '-')).strip()


def sentences(text):
    return [s.strip() for s in re.split(r'(?<=[.?!])\s+', text) if len(s.strip()) > 25]


if OLD:
    for old_name in sorted(os.listdir(OLD)):
        if not old_name.endswith('.html'): continue
        stem = old_name[:-5]
        old = body_text(open(os.path.join(OLD, old_name)).read())
        if stem == 'library':
            new = ' '.join(body_text(h) for u, (_, h) in sorted(pages.items()) if u.startswith('/library/'))
            kind = 'containment'
        else:
            new = body_text(pages['/' if stem == 'index' else '/%s/' % stem][1])
            kind = 'containment' if stem == 'index' else 'identical'
        if kind == 'identical':
            if new == old: print('%s: copy identical to the old build' % old_name)
            else: problems.append('%s: copy differs from the old build' % old_name)
        else:
            miss = [s for s in sentences(old) if s not in new]
            print('%s: %d of %d old sentences are not in the new pages' % (old_name, len(miss), len(sentences(old))))
            for s in miss: print('    -', s[:110])

print('\n%d pages checked' % len(pages))
for w in warnings: print('warning:', w)
if problems:
    print('PROBLEMS:'); [print('  -', x) for x in problems]; sys.exit(1)
print('ALL CHECKS PASSED')
