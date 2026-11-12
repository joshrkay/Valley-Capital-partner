// Deterministic checks around the model: build the front matter ourselves (always draft: true), lint the body against the voice guide,
// refuse invented figures, links, and names, and gate publishing. Nothing here calls a model.
import { canonicalUrl } from './lib.mjs';

export const slugify = (title, max = 70) => {
  const s = String(title).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return s.slice(0, max).replace(/-+$/g, '') || 'untitled';
};

export function uniqueSlug(slug, exists) {
  let s = slug, n = 2;
  while (exists(s)) s = `${slug}-${n++}`;
  return s;
}

export function sanitizeTags(tags) {
  const out = [];
  for (const t of Array.isArray(tags) ? tags : []) {
    const c = String(t).toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, ' ').trim().slice(0, 30);
    if (c && !out.includes(c)) out.push(c);
  }
  return out.slice(0, 4);
}

// The model never writes front matter. This always says draft: true, so nothing it produces can publish by itself.
export function buildFrontMatter({ title, description, date, category, tags }) {
  const q = (s) => JSON.stringify(String(s));
  return ['---', `title: ${q(title)}`, `description: ${q(description)}`, `date: ${date}`, `category: ${q(category)}`, `tags: [${tags.map(q).join(', ')}]`, 'draft: true', '---', ''].join('\n');
}

const wordCount = (s) => String(s).trim().split(/\s+/).filter(Boolean).length;
const LINK = /\[([^\]]*)\]\(([^)\s]+)\)/g;
const PLACEHOLDER = /\[CONFIRM:[^\]]*\]/g;
const FIG = /(\$\s?)?(\d[\d,]*(?:\.\d+)?)(\s?(?:%|percent\b|bps\b|basis points?\b|million\b|billion\b|trillion\b|thousand\b|[MBK]\b))?/gi;
const CAPS = /\b[A-Z][A-Za-z0-9&'’.-]+(?:\s+[A-Z][A-Za-z0-9&'’.-]+)+/g;

const normNum = (d) => (d.includes('.') ? d.replace(/0+$/, '').replace(/\.$/, '') : d);

// Figures worth auditing: anything with $, %, a unit, a decimal point, or three or more digits. Years and small bare numbers are skipped.
export function figuresIn(text) {
  const out = [];
  for (const m of String(text).matchAll(FIG)) {
    const [raw, dollar, num, unit] = m;
    const digits = num.replace(/,/g, '');
    if (!dollar && !unit && /^(19|20)\d{2}$/.test(digits)) continue;
    const marked = Boolean(dollar || unit || num.includes('.'));
    if (marked || digits.replace(/\..*/, '').length >= 3) out.push({ raw: raw.trim(), value: normNum(digits) });
  }
  return out;
}

const numberTokens = (text) => new Set([...String(text).matchAll(/\d[\d,]*(?:\.\d+)?/g)].map((m) => normNum(m[0].replace(/,/g, ''))));

function ngrams(seq) {
  const w = seq.split(/\s+/), out = [];
  for (let i = 0; i < w.length; i++) for (let j = i + 2; j <= w.length; j++) out.push(w.slice(i, j).join(' '));
  return out;
}

// Capitalised multi-word names in the source that are not publishers, agencies, places, or generic terms. A pattern-only post must not repeat them.
export function sourceNames(brief, cfg) {
  const allowed = cfg.allowedEntities.map((a) => a.toLowerCase());
  const text = `${brief.title ?? ''}. ${brief.snippet ?? ''}`;
  const names = new Set();
  for (const m of text.matchAll(CAPS)) for (const g of ngrams(m[0])) {
    const lg = g.toLowerCase();
    if (allowed.some((a) => a === lg || a.includes(lg))) continue;
    names.add(g);
  }
  return [...names];
}

export function properNounsIn(body, cfg) {
  const allowed = cfg.allowedEntities.map((a) => a.toLowerCase());
  const found = new Set();
  for (const m of String(body).matchAll(CAPS)) if (!allowed.includes(m[0].toLowerCase())) found.add(m[0]);
  return [...found].slice(0, 20);
}

function insideQuotes(paragraph, index) {
  return (paragraph.slice(0, index).match(/"/g) ?? []).length % 2 === 1;
}

// post: { title, description, category, body }. brief: what the drafter was given. ctx: { cfg, targets }.
export function lintDraft(post, brief, ctx) {
  const { cfg, targets } = ctx;
  const errors = [], warnings = [];
  const body = String(post.body ?? '');
  const all = `${post.title}\n${post.description}\n${body}`;

  for (const p of cfg.banned) { const m = all.match(new RegExp(`\\b(?:${p})\\b`, 'i')); if (m) errors.push(`Banned word or phrase: "${m[0]}".`); }
  for (const p of cfg.british) { const m = all.match(new RegExp(`\\b(?:${p})`, 'i')); if (m) errors.push(`British spelling: "${m[0]}". Use American English.`); }
  for (const phrase of cfg.quotedOnly ?? []) {
    for (const para of all.split(/\n\s*\n/)) {
      const re = new RegExp(phrase, 'ig');
      let m;
      while ((m = re.exec(para))) if (!insideQuotes(para, m.index)) errors.push(`"${phrase}" may appear only as a quoted market phrase.`);
    }
  }
  if (/<!--/.test(body)) errors.push('Do not write HTML comments in the body.');
  if (/<\/?[a-z][^>]*>/i.test(body)) errors.push('Do not write HTML tags in the body.');
  if (/^---\s*$/m.test(body) || /^(title|description|draft):/im.test(body)) errors.push('Do not write front matter in the body.');
  if (/^#\s/m.test(body)) errors.push('Do not write a title heading in the body. Start with the first paragraph.');
  if (/!\[/.test(body)) errors.push('Do not use images.');
  if (/!/.test(`${post.title}\n${post.description}\n${body.replace(/\]\([^)]*\)/g, '')}`)) errors.push('No exclamation marks.');

  if (!post.title || post.title.length > cfg.titleMax) errors.push(`Title must be 1 to ${cfg.titleMax} characters.`);
  if (/\?/.test(post.title ?? '')) errors.push('The headline must not be a question.');
  if (/[<>`]/.test(`${post.title ?? ''}${post.description ?? ''}`)) errors.push('The title and description must be plain text, without HTML or backticks.');
  if (!post.description || post.description.length > cfg.descriptionMax) errors.push(`Description must be 1 to ${cfg.descriptionMax} characters.`);
  else if (post.description.length < 40) warnings.push('Description is very short.');
  if (!cfg.categories.includes(post.category)) errors.push(`Category must be one of: ${cfg.categories.join(', ')}.`);

  if (!/^##\s+What we don't know\s*$/im.test(body)) errors.push('Missing the "## What we don\'t know" section.');
  if (brief.sourceUrl && !/^##\s+Sources\s*$/im.test(body)) errors.push('Missing the "## Sources" section.');
  if (!/^Last checked:\s+\S/im.test(body)) errors.push('Missing the "Last checked: <date>" line.');

  const range = cfg.wordRanges[brief.lane];
  const prose = body.split(/^##\s+Sources\s*$/im)[0];
  const n = wordCount(prose);
  if (range && (n < range[0] || n > range[1])) warnings.push(`Length is ${n} words; the ${brief.lane} range is ${range[0]} to ${range[1]}.`);
  for (const para of prose.split(/\n\s*\n/)) {
    if (/^(\s*[-*]|\s*\d+\.|#)/.test(para) || para.includes('\n-')) continue;
    if (wordCount(para) > 70) warnings.push(`A paragraph runs ${wordCount(para)} words (the guide says under about 70): "${para.slice(0, 50)}..."`);
  }

  const allowedExternal = new Set((brief.allowedUrls ?? []).map(canonicalUrl).filter(Boolean));
  const seenGlossary = new Set();
  for (const m of body.matchAll(LINK)) {
    const url = m[2];
    if (url.startsWith('/')) {
      if (!targets.has(url)) errors.push(`Internal link does not exist: ${url}`);
      if (url.startsWith('/glossary/#')) { if (seenGlossary.has(url)) warnings.push(`Glossary term linked more than once: ${url}`); seenGlossary.add(url); }
    } else if (/^https?:\/\//i.test(url)) {
      if (!allowedExternal.has(canonicalUrl(url))) errors.push(`External link is not one the reviewer or the source provided: ${url}`);
    } else errors.push(`Unsupported link: ${url}`);
  }
  if (brief.sourceUrl && !new RegExp(brief.sourceUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\/$/, '') + '/?\\)').test(body)) warnings.push('The source is not linked in the post.');

  // Figures: every audited figure must appear in the title, snippet, source, or reviewer facts.
  const placeholders = [...body.matchAll(PLACEHOLDER)].map((m) => m[0]);
  const auditable = prose.replace(PLACEHOLDER, ' ').replace(/^Last checked:.*$/gim, ' ').replace(LINK, '$1').replace(/https?:\/\/\S+/g, ' ');
  const evidence = numberTokens([brief.title, brief.snippet, brief.sourceName, brief.sourceDate, ...(brief.facts ?? [])].join(' \n '));
  const figures = figuresIn(auditable);
  const unsupported = figures.filter((f) => !evidence.has(f.value));
  for (const f of unsupported) errors.push(`Figure not in the source or the reviewer's facts: "${f.raw}". Remove it or write [CONFIRM: ...] instead.`);

  // A pattern-only post must not repeat a name taken from the source.
  const names = brief.patternOnly ? sourceNames(brief, cfg).filter((g) => body.includes(g)) : [];
  for (const g of names) errors.push(`This post must describe the pattern, not the party. Remove the name: "${g}".`);

  return { errors: [...new Set(errors)], warnings: [...new Set(warnings)], placeholders, figures: { checked: figures.length, unsupported: unsupported.map((f) => f.raw) }, namesToConfirm: properNounsIn(prose, cfg) };
}

// ---- publish gate ----

// files: [{ path, data (front matter), text }]. A published post must not carry an unresolved marker.
export function gateViolations(files) {
  const out = [];
  for (const f of files) {
    if (f.data.draft === true) continue;
    if (/\[CONFIRM\b/.test(f.text)) out.push(`${f.path}: contains an unresolved [CONFIRM: ...] placeholder.`);
    if (/VERIFY BEFORE PUBLISHING/.test(f.text)) out.push(`${f.path}: still carries the "VERIFY BEFORE PUBLISHING" note. Check every figure at its source, then delete the note.`);
  }
  return out;
}
