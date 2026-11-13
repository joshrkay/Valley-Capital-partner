// Loads every committed rule file in one place: config, models, claims, terminology, playbooks, the desk's banned-word list, the bank terminology rules, and the site's page list.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { REPO } from './paths.mjs';

const json = (p) => JSON.parse(readFileSync(p, 'utf8'));

export function sitePages(root = REPO) {
  const base = join(root, 'src/pages');
  const out = new Set();
  const walk = (d) => {
    if (!existsSync(d)) return;
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (!name.endsWith('.astro') || name.includes('[') || name === '404.astro') continue;
      let rel = '/' + relative(base, p).replace(/\\/g, '/').replace(/\.astro$/, '');
      rel = rel.replace(/\/index$/, '') + '/';
      out.add(rel.replace(/\/\/+/g, '/'));
    }
  };
  walk(base);
  return out;
}

export function loadRules(root = REPO) {
  const o = (f) => json(join(root, 'outbound', f));
  const terminology = o('terminology.json');
  const siteRules = json(join(root, terminology.bankRulesFrom));
  return {
    config: o('config.json'),
    models: o('models.json'),
    claims: o('claims.json').claims,
    terminology,
    playbooks: o('playbooks.json'),
    desk: json(join(root, 'desk/lint.json')),
    bankAvoid: siteRules.rules.find((r) => r.scope === '/banks/')?.avoid ?? [],
    pages: sitePages(root),
  };
}
