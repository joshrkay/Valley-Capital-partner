// Deterministic checks around the model: build the front matter ourselves (always draft: true), lint a post against the voice guide,
// refuse thin or padded writing, invented figures, links, and names, and gate publishing. Nothing here calls a model.
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

const LINK = /\[([^\]]*)\]\(([^)\s]+)\)/g;
const PLACEHOLDER = /\[CONFIRM:[^\]]*\]/g;
const FIG = /(\$\s?)?(\d[\d,]*(?:\.\d+)?)(\s?(?:%|percent\b|bps\b|basis points?\b|million\b|billion\b|trillion\b|thousand\b|[MBK]\b))?/gi;
const CAPS = /\b[A-Z][A-Za-z0-9&'’.-]+(?:\s+[A-Z][A-Za-z0-9&'’.-]+)+/g;
const SOURCES_HEADING = /^##\s+Sources\s*$/im;
const DEFAULT_LABEL = '**Illustration (invented numbers):**';

// The one definition of a post's length: the article from its first paragraph to the end of the last section before "## Sources".
// HTML comments, [CONFIRM: ...] placeholders, the "Last checked" line, link addresses, and markdown marks do not count.
export function countWords(body) {
  let t = String(body ?? '').replace(/<!--[\s\S]*?-->/g, ' ');
  t = t.split(SOURCES_HEADING)[0];
  t = t.replace(/^Last checked:.*$/gim, ' ').replace(PLACEHOLDER, ' ');
  t = t.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/^#{1,6}\s+/gm, '').replace(/^\s*(?:[-*]|\d+\.)\s+/gm, '').replace(/[*_`>]/g, ' ');
  return t.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

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

const insideQuotes = (paragraph, index) => (paragraph.slice(0, index).match(/"/g) ?? []).length % 2 === 1;
const isListLine = (l) => /^\s*(?:[-*]|\d+\.)\s+/.test(l);

// post: { title, description, category, body }. brief: what the drafter was given, or null to lint an existing post on its own.
// ctx: { cfg, targets }. A standalone lint checks the house rules only; the source, figure, link-allowlist, and name checks need a brief.
export function lintDraft(post, brief, ctx) {
  const { cfg, targets } = ctx;
  const standalone = !brief;
  brief = brief ?? {};
  const errors = [], warnings = [];
  const body = String(post.body ?? '');
  const all = `${post.title}\n${post.description}\n${body}`;
  const label = cfg.illustrationLabel ?? DEFAULT_LABEL;

  for (const p of cfg.banned) { const m = all.match(new RegExp(`\\b(?:${p})\\b`, 'i')); if (m) errors.push(`Banned word or phrase: "${m[0]}".`); }
  for (const p of cfg.fillerPhrases ?? []) { const m = all.match(new RegExp(`\\b(?:${p})\\b`, 'i')); if (m) errors.push(`Filler: "${m[0]}". Say the specific thing instead.`); }
  for (const p of cfg.british) { const m = all.match(new RegExp(`\\b(?:${p})`, 'i')); if (m) errors.push(`British spelling: "${m[0]}". Use American English.`); }
  for (const phrase of cfg.quotedOnly ?? []) {
    for (const para of all.split(/\n\s*\n/)) {
      const re = new RegExp(phrase, 'ig');
      let m;
      while ((m = re.exec(para))) if (!insideQuotes(para, m.index)) errors.push(`"${phrase}" may appear only as a quoted market phrase.`);
    }
  }
  const visible = body.replace(/<!--[\s\S]*?-->/g, ' ');                         // an existing post may carry the desk's VERIFY note; a new draft may not
  if (!standalone && /<!--/.test(body)) errors.push('Do not write HTML comments in the body.');
  if (/<\/?[a-z][^>]*>/i.test(visible)) errors.push('Do not write HTML tags in the body.');
  if (/^---\s*$/m.test(body) || /^(title|description|draft):/im.test(body)) errors.push('Do not write front matter in the body.');
  if (/^#\s/m.test(body)) errors.push('Do not write a title heading in the body. Start with the first paragraph.');
  if (/!\[/.test(body)) errors.push('Do not use images.');
  if (/!/.test(`${post.title}\n${post.description}\n${visible.replace(/\]\([^)]*\)/g, '')}`)) errors.push('No exclamation marks.');
  for (const p of cfg.warnWords ?? []) { const m = all.match(new RegExp(`\\b(?:${p})\\b`, 'i')); if (m) warnings.push(`Check the word "${m[0]}": fine as a hedge ("neither is guaranteed"), not as a promise.`); }

  if (!post.title || post.title.length > cfg.titleMax) errors.push(`Title must be 1 to ${cfg.titleMax} characters.`);
  if (/\?/.test(post.title ?? '')) errors.push('The headline must not be a question.');
  if (/[<>`]/.test(`${post.title ?? ''}${post.description ?? ''}`)) errors.push('The title and description must be plain text, without HTML or backticks.');
  if (!post.description || post.description.length > cfg.descriptionMax) errors.push(`Description must be 1 to ${cfg.descriptionMax} characters.`);
  else if (post.description.length < 40) warnings.push('Description is very short.');
  if (!cfg.categories.includes(post.category)) errors.push(`Category must be one of: ${cfg.categories.join(', ')}.`);

  if (!standalone) {
    if (!/^##\s+What we don't know\s*$/im.test(body)) errors.push('Missing the "## What we don\'t know" section.');
    if (brief.sourceUrl && !SOURCES_HEADING.test(body)) errors.push('Missing the "## Sources" section.');
    if (!/^Last checked:\s+\S/im.test(body)) errors.push('Missing the "Last checked: <date>" line.');
  }

  // Length: one range for every post. Too short usually means too little substance, not too few words.
  const [lo, hi] = cfg.wordRange ?? [0, Infinity];
  const n = countWords(body);
  if (n < lo) errors.push(`Too short: ${n} words; a post must be ${lo} to ${hi}. Add substance (a distinction, a worked illustration, a failure mode, a concrete check), never filler.`);
  if (n > hi) errors.push(`Too long: ${n} words; a post must be ${lo} to ${hi}. Cut repetition and the weakest section.`);

  // Thin or padded writing, as far as code can tell.
  const prose = body.split(SOURCES_HEADING)[0].replace(/^Last checked:.*$/gim, ' ');
  const sentences = prose.replace(/^#{1,6}.*$/gm, ' ').split(/(?<=[.!?])\s+/).map((s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()).filter((s) => s.split(' ').length >= 8);
  const dup = sentences.find((s, i) => sentences.indexOf(s) !== i);
  if (dup) errors.push(`A sentence repeats word for word: "${dup.slice(0, 60)}..."`);
  const paras = prose.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p && !/^#/.test(p));
  const openers = {};
  for (const p of paras.filter((q) => !isListLine(q.split('\n')[0]))) { const o = p.replace(/[*_]/g, '').split(/\s+/).slice(0, 3).join(' ').toLowerCase(); openers[o] = (openers[o] ?? 0) + 1; }
  for (const [o, c] of Object.entries(openers)) if (c >= 3) warnings.push(`${c} paragraphs open with "${o}". Vary the construction.`);
  const listWords = prose.split('\n').filter(isListLine).join(' ').split(/\s+/).filter(Boolean).length;
  if (n && listWords / n > 0.4) warnings.push(`${Math.round((100 * listWords) / n)}% of the post is bullet points. Write it as prose where the reasoning matters.`);
  for (const para of paras) {
    if (isListLine(para.split('\n')[0]) || para.includes('\n-')) continue;
    const w = para.split(/\s+/).length;
    if (w > 70) warnings.push(`A paragraph runs ${w} words (the guide says under about 70): "${para.slice(0, 50)}..."`);
  }

  const allowedExternal = new Set((brief.allowedUrls ?? []).map(canonicalUrl).filter(Boolean));
  const seenGlossary = new Set();
  for (const m of body.matchAll(LINK)) {
    const url = m[2];
    if (url.startsWith('/')) {
      if (!targets.has(url)) errors.push(`Internal link does not exist: ${url}`);
      if (url.startsWith('/glossary/#')) { if (seenGlossary.has(url)) warnings.push(`Glossary term linked more than once: ${url}`); seenGlossary.add(url); }
    } else if (/^https?:\/\//i.test(url)) {
      if (!standalone && !allowedExternal.has(canonicalUrl(url))) errors.push(`External link is not one the reviewer or the source provided: ${url}`);
    } else errors.push(`Unsupported link: ${url}`);
  }
  if (brief.sourceUrl && !new RegExp(brief.sourceUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\/$/, '') + '/?\\)').test(body)) warnings.push('The source is not linked in the post.');

  const placeholders = [...body.matchAll(PLACEHOLDER)].map((m) => m[0]);
  const illustrations = paras.filter((p) => p.startsWith(label)).length;
  let figures = { checked: 0, unsupported: [] }, names = [];
  if (!standalone) {
    // Figures: every audited figure must appear in the title, snippet, source, reviewer facts, or approved background.
    // A paragraph that starts with the illustration label is exempt: its numbers are invented and labeled as such.
    const auditable = prose.split(/\n\s*\n/).filter((p) => !p.trim().startsWith(label)).join('\n\n').replace(PLACEHOLDER, ' ').replace(LINK, '$1').replace(/https?:\/\/\S+/g, ' ');
    const evidence = numberTokens([brief.title, brief.snippet, brief.sourceName, brief.sourceDate, ...(brief.facts ?? []), ...(brief.background ?? []).map((b) => b.text)].join(' \n '));
    const found = figuresIn(auditable);
    const unsupported = found.filter((f) => !evidence.has(f.value));
    for (const f of unsupported) errors.push(`Figure not in the source, the reviewer's facts, or the approved background: "${f.raw}". Remove it, put it in a labeled illustration, or write [CONFIRM: ...] instead.`);
    figures = { checked: found.length, unsupported: unsupported.map((f) => f.raw) };
    // A pattern-only post must not repeat a name taken from the source.
    if (brief.patternOnly) names = sourceNames(brief, cfg).filter((g) => body.includes(g));
    for (const g of names) errors.push(`This post must describe the pattern, not the party. Remove the name: "${g}".`);
  }

  return { errors: [...new Set(errors)], warnings: [...new Set(warnings)], placeholders, illustrations, words: n, figures, namesToConfirm: properNounsIn(prose, cfg) };
}

// ---- publish gate ----

// files: [{ path, data (front matter), text, body }]. A post that is not a draft must carry no unresolved marker and must be within the word range.
export function gateViolations(files, cfg = {}) {
  const out = [];
  const exempt = new Set(cfg.lengthExempt ?? []);
  for (const f of files) {
    if (f.data.draft === true) continue;
    if (/\[CONFIRM\b/.test(f.text)) out.push(`${f.path}: contains an unresolved [CONFIRM: ...] placeholder.`);
    if (/VERIFY BEFORE PUBLISHING/.test(f.text)) out.push(`${f.path}: still carries the "VERIFY BEFORE PUBLISHING" note. Check every figure at its source, then delete the note.`);
    if (cfg.wordRange) {
      const slug = f.path.replace(/^.*\//, '').replace(/\.md$/, '');
      const n = countWords(f.body ?? f.text);
      if (!exempt.has(slug) && (n < cfg.wordRange[0] || n > cfg.wordRange[1])) out.push(`${f.path}: ${n} words. A published post must be ${cfg.wordRange[0]} to ${cfg.wordRange[1]}.`);
    }
  }
  return out;
}
