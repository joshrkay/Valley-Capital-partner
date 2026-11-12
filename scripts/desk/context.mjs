// What the models are told about this site: the voice guide, and an index of the pages a post may link to.
// Reads files only. Used by triage, the drafter, and the tests (which pass a temporary root).
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export function readFrontMatter(text) {
  const m = String(text).match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const data = {};
  if (!m) return { data, body: String(text) };
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].replace(/\s+#.*$/, '').trim();
    if (v.startsWith('[')) { try { v = JSON.parse(v); } catch { v = []; } }
    else if (v === 'true' || v === 'false') v = v === 'true';
    else if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) { try { v = JSON.parse(v.startsWith("'") ? `"${v.slice(1, -1)}"` : v); } catch { v = v.slice(1, -1); } }
    data[kv[1]] = v;
  }
  return { data, body: String(text).slice(m[0].length) };
}

const mdFiles = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md') && !f.startsWith('_')).sort() : []);

function pagePaths(root) {
  const base = join(root, 'src/pages');
  const out = [];
  const walk = (d) => {
    if (!existsSync(d)) return;
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (!name.endsWith('.astro') || name.includes('[') || name === '404.astro') continue;
      let rel = '/' + relative(base, p).replace(/\\/g, '/').replace(/\.astro$/, '');
      rel = rel.replace(/\/index$/, '') + '/';
      out.push(rel.replace(/\/\/+/g, '/'));
    }
  };
  walk(base);
  return out.sort();
}

export function buildIndex(root) {
  const read = (rel) => readFileSync(join(root, rel), 'utf8');
  const posts = mdFiles(join(root, 'src/content/blog')).map((f) => {
    const { data } = readFrontMatter(read(`src/content/blog/${f}`));
    return { slug: f.replace(/\.md$/, ''), title: data.title ?? '', description: data.description ?? '', category: data.category ?? '', tags: data.tags ?? [], draft: data.draft === true };
  });
  const glossary = mdFiles(join(root, 'src/content/glossary')).map((f) => ({ slug: f.replace(/\.md$/, ''), term: readFrontMatter(read(`src/content/glossary/${f}`)).data.term ?? f }));
  const library = mdFiles(join(root, 'src/content/library')).map((f) => {
    const { data } = readFrontMatter(read(`src/content/library/${f}`));
    return { slug: f.replace(/\.md$/, ''), title: data.title ?? '', topic: data.topic ?? '' };
  });
  return { posts, glossary, library, pages: pagePaths(root) };
}

// Internal addresses a post may link to. Draft posts are not on the list: a link to one would break the published site.
export function linkTargets(index) {
  const s = new Set(index.pages);
  for (const p of index.posts) if (!p.draft) s.add(`/blog/${p.slug}/`);
  for (const l of index.library) s.add(`/library/${l.slug}/`);
  for (const g of index.glossary) s.add(`/glossary/#${g.slug}`);
  return s;
}

export function indexForPrompt(index) {
  const L = [];
  L.push('PUBLISHED POSTS (link as /blog/<slug>/):');
  for (const p of index.posts.filter((x) => !x.draft)) L.push(`- ${p.slug}: ${p.title}`);
  L.push('', 'LIBRARY NOTES (link as /library/<slug>/):');
  for (const l of index.library) L.push(`- ${l.slug}: ${l.title}`);
  L.push('', 'GLOSSARY TERMS (link as /glossary/#<slug>, on first use only):');
  L.push(index.glossary.map((g) => `${g.slug} (${g.term})`).join('; '));
  L.push('', 'OTHER PAGES:', index.pages.filter((p) => !p.startsWith('/blog/') && !p.startsWith('/library/')).join(' '));
  return L.join('\n');
}

export function loadVoice(root) {
  const p = join(root, 'docs/voice.md');
  if (!existsSync(p)) throw new Error('docs/voice.md not found');
  return readFileSync(p, 'utf8');
}

export const loadJson = (root, rel) => JSON.parse(readFileSync(join(root, rel), 'utf8'));
