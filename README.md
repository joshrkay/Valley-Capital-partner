# Valley Capital Partners website

The website for Valley Capital Partners, a buyer of non-performing hotel loans. It is built to grow: a set of core pages about what the firm does, and a **Resources** area made of a **Library** of technical notes, a **Blog**, a **Glossary**, and an **FAQ**. The notes, posts, and glossary terms are plain Markdown files that anyone can add to without touching code.

**Design:** dark and quiet, with Outfit type, one amber accent, monospace numbered labels, and a dimmed, slowed-down hotel video inside the hero at the top of each page. Below the hero the page is plain dark, so the text stays easy to read.

**Stack:** [Astro](https://astro.build) (a static site generator), Markdown content, hosted on [Vercel](https://vercel.com). No database, no server, no client framework: pages are plain HTML, CSS and a little JavaScript.

## Quick start

You need Node.js 22.12 or newer.

```bash
npm install          # once
npm run dev          # writing mode at http://localhost:4321, includes drafts, reloads as you edit
npm run build        # builds the site into dist/ (also fetches the background clips the first time)
npm run preview      # serve the built site locally
npm run check        # after a build: links, anchors, assets, markup, styles (needs Python 3)
```

## Adding content

### A blog post

1. Copy `src/content/blog/_TEMPLATE.md` to a new file, for example `src/content/blog/how-a-comfort-letter-works.md`. The file name becomes the address: `/blog/how-a-comfort-letter-works/`.
2. Fill in the front matter at the top (title, a description under 220 characters, date, optional category and tags) and write the post in Markdown below it.
3. Keep `draft: true` while writing: drafts show in `npm run dev` and never in the live site. Set it to `false` to publish.

Tags become their own pages automatically (`/blog/tags/<tag>/`). The list page, the tag pages, the RSS feed (`/rss.xml`) and the sitemap all update themselves. Until the first post is published, the build prints a harmless warning that the blog collection is empty.

### A Library note

Same idea, in `src/content/library/`. Notes are longer technical pieces; `order` in the front matter sets where each appears in the list, and `topic` is the short label shown beside the title. The five existing notes are there as examples.

### A glossary term

Add a file to `src/content/glossary/`, for example `src/content/glossary/revpar.md`, with one line of front matter (`term: "Revenue per available room (RevPAR)"`) and the definition below it. The file name is the anchor, so other pages can link to `/glossary/#revpar`. Terms are sorted alphabetically and grouped by letter automatically.

### The FAQ

The questions and answers are a list at the top of `src/pages/faq.astro`. Add or edit an entry there; the page and its search-engine markup both update. Keep answers consistent with the core pages: every current answer restates what those pages already say.

### A page inside Banks or Receivers

The Banks and Receivers areas are sections of several pages, each with a sub-navigation bar under the hero and an overview page that links to the rest. To add a page, create it in `src/pages/banks/` or `src/pages/receivers/` (copy a sibling, for example `src/pages/banks/what-we-buy.astro`) and list it in `src/lib/sections.ts`. That one list drives the sub-navigation bar and the "In this section" cards. Question-and-answer pages use the `FaqList` component and publish FAQ search markup automatically.

### A new page

Add a file to `src/pages/`, for example `src/pages/team.astro`, using the same shape as `src/pages/firm.astro`: the `Base` layout, a `Hero`, a `<main id="main">` with sections, and a `Cta`. Add it to the menu in `src/components/Header.astro` (and the footer, if it belongs there).

### A new kind of content

Case studies, FAQs, or team profiles each work the same way as the blog: add a collection in `src/content.config.ts` (a folder of Markdown files plus a checked list of front matter fields), then a list page and a detail page under `src/pages/`. `src/pages/library/` is the shortest example to copy.

## How it is organized

| Path | What it is |
|---|---|
| `src/pages/` | One file per page: `index`, `banks`, `receivers`, `servicers`, `borrowers`, `underwriting`, `firm`, `contact`, `resources` (the hub), `faq`, `glossary`, and `404`, plus `library/`, `blog/`, and `rss.xml.js`. |
| `src/content/blog/`, `library/`, `glossary/` | The Markdown content. Front matter is checked against `src/content.config.ts` at build time, so a typo fails loudly instead of publishing a broken page. |
| `docs/terminology.md` | The terminology guide: the canonical words per audience. |
| `src/lib/` | `sections.ts` (the pages in each audience section), `posts.ts` and `tags.ts` (blog helpers). |
| `src/layouts/Base.astro` | The page shell: head and search-engine tags (canonical link, Open Graph, structured data), header, footer, scripts. The hero video lives in the `Hero` component (and in the home page's own hero). |
| `src/components/` | `Header`, `Footer`, `Logo`, `Hero`, `Cta`, `PostCard`, `SectionNav` (sub-navigation for Banks and Receivers), `FaqList`. |
| `src/styles/site.css` | The whole design. Colors and the accent are variables at the top. |
| `src/scripts/bg.js` | The background video: crossfades clips as sections scroll by and sets how strong the video is. Paused for reduced-motion, a single clip on phones, none on data-saver. |
| `src/scripts/site.js` | Frosted header on scroll, mobile menu, sections settling into place. |
| `public/` | Files served as they are: favicon, `robots.txt`, and the background clips (`public/video/`, fetched by the build, not stored in git). |
| `scripts/` | `fetch-video.mjs` (downloads the clips) and `check_site.py` (static checks on `dist/`). |
| `vercel.json` | Hosting: build command, output folder, security and noindex headers, caching. |

## Terminology

Each audience reads the site in its own words, and every page has to say the same thing the same way. `docs/terminology.md` fixes the canonical word for each idea (for example "loan sale" and "principal balance" for community banks, where special servicers say "note sale"), and `scripts/terminology.json` holds the rules `npm run check` enforces: if a Banks page says "note sale" or "troubled loan", the check fails and names the word to use. A block that lists variants on purpose, such as the loan summary's "You may write" table, is marked `data-terms="variants"`. The work goes one audience at a time: community banks first, then regional banks, then special servicers, then receivers and hotel owners.

## Making design changes

- **Words on a core page:** edit that page in `src/pages/`.
- **Colors and type:** the variables at the top of `src/styles/site.css` (`--accent`, `--bg`, `--display`).
- **How visible the video is:** each section can carry `data-bg` (which clip) and `data-op` (strength from 0 to 1). Sections without them inherit the previous clip and fade right down. The home story beats use about `.26` and the hero `.34`; turn these down if text ever feels hard to read.

Run `npm run build` and then `npm run check` before opening a pull request. The check fails on any broken link or anchor, missing asset, unbalanced markup, page without exactly one heading, or CSS class that has no style.

## Hosting

Vercel builds the site from `main` (`vercel.json` holds the settings: `npm run build`, output `dist`). Every pull request gets its own preview address once the repository is connected to a Vercel project. Set the environment variable `SITE_URL` to the production address so canonical links, the sitemap and the feed use it; until then they use `https://valleycapitalpartner.com`.

## Pull requests

1. Branch from `main`, named for the change (`blog/comfort-letters`, `copy/banks-page`, `design/hero-fade`).
2. Run `npm run build` and `npm run check`.
3. Open a pull request saying what changed and what you looked at.
4. Merge when the Vercel preview looks right.

## Before launch

- [ ] The site is deliberately hidden from search engines: `X-Robots-Tag: noindex` in `vercel.json` and `Disallow: /` in `public/robots.txt`. Remove both when going live.
- [ ] Firm facts still to confirm: principals, phone, address, loan size range, regions, and the bid terms on the special servicers page.
- [ ] The contact address `acquisitions@valleycapitalpartner.com` must exist as a working mailbox.
- [ ] Attach the production domain in Vercel and set `SITE_URL`.
- [ ] Have counsel read the Banks and Receivers pages. They restate the site's existing copy and add general explanation (for example the outline of a receiver's sale and the typical terms of a loan sale), which should be checked against how the firm actually works.
- [ ] Review the wording that is new: the Blog and Resources page intros, the 404 page, the FAQ, the glossary definitions, and the first eight blog posts. They are general explanations drafted without any firm-specific facts, and they should be read by someone qualified (ideally counsel) before launch.
- [ ] Look at every page on a phone and a laptop, with the background video both playing and blocked.

## Ideas for later

Site search (Pagefind works with static sites), a case-study collection, a newsletter sign-up, analytics, social preview images per post, and a browser-based editor for non-technical authors (Keystatic or Decap both write the same Markdown files).

## Brand

The logo is a bold **V** (the valley) with an amber window lit in its notch: a hotel window, and the "lights return" idea behind the firm's story. Wordmark is Outfit (SIL Open Font License), medium weight.

| File | Use |
|---|---|
| `public/brand/logo-lockup.svg` | Mark and name together, for dark backgrounds (lettering is outlined, so no font is needed) |
| `public/brand/logo-lockup-dark.svg` | The same for light backgrounds, such as letterhead or slides |
| `public/brand/logo-mark.svg`, `logo-mark-dark.svg` | The mark alone, light and dark versions |
| `public/favicon.svg`, `public/apple-touch-icon.png` | Browser tab and phone home-screen icons |
| `public/og-image.png` | The 1200 by 630 preview shown when a page is shared |

Colors: ink `#0B1626`, background `#050E16`, text `#EEF3F7`, accent amber `#F5B454`. The mark in the header is `src/components/Logo.astro` and takes the surrounding text color.

## Video credits

Background footage is from [Mixkit](https://mixkit.co) under the [Mixkit Video Free License](https://mixkit.co/license/#videoFree): free for commercial use, no attribution required, but the files may not be redistributed on their own. That is why they are fetched at build time and not committed to this repository. If the repository is ever made private you may commit them instead.

| File | Mixkit clip |
|---|---|
| `hotel-lit.mp4` | Hotel rooms with the lights on (27291) |
| `hotel-corridor.mp4` | Corridor of an elegant hotel (34613) |
