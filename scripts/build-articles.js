#!/usr/bin/env node
/* eslint-disable no-console */

/*
 * Lintel article builder.
 *
 * Reads markdown files from ../assets/articles/, renders them with markdown-it
 * + footnote plugin, and writes one HTML page per article into
 * ../writing/<slug>/index.html using the article shell from page_specs.md.
 *
 * The article inventory (slug, category, title, publish date, excerpt) is
 * declared inline below — these values are spec-locked and treated as canon.
 *
 * Usage:
 *   cd scripts
 *   npm install
 *   node build-articles.js
 */

const fs = require('fs');
const path = require('path');
const MarkdownIt = require('markdown-it');
const footnotePlugin = require('markdown-it-footnote');

const REPO_ROOT = path.resolve(__dirname, '..');
const ARTICLES_DIR = path.join(REPO_ROOT, 'assets', 'articles');
const WRITING_DIR = path.join(REPO_ROOT, 'writing');

const SITE_ORIGIN = 'https://lintelstandard.com';

// --- Inventory --------------------------------------------------------------
// Order: most recent first.
const ARTICLES = [
  {
    slug: 'defense-in-depth',
    file: 'Article 5 — Defense in Depth for Attested Execution.md',
    title: 'Defense in Depth for Attested Execution',
    category: 'TECHNICAL',
    published: '2026-04-25',
    excerpt:
      'Trusted Execution Environments have a published record of serious, remotely exploitable vulnerabilities. The right question is what survives a TEE break, not whether TEEs can break — and the answer determines what a verification platform owes its readers.',
  },
  {
    slug: 'tees-vs-zk-mpc-fhe',
    file: 'Article 6 — Why TEEs — Not ZK, MPC, or FHE.md',
    title: 'Why TEEs — Not ZK, MPC, or FHE',
    category: 'TECHNICAL',
    published: '2026-04-18',
    excerpt:
      'TEEs are not the strongest cryptographic primitive when measured against zero-knowledge proofs, secure multiparty computation, or fully homomorphic encryption. The question is which one closes the Proof-Execution Gap today, on commodity hardware, at the latency a systematic strategy requires.',
  },
  {
    slug: 'offline-verifiability',
    file: 'Article 7 — Offline Verifiability - Architectural, Not Contractual.md',
    title: 'Offline Verifiability: Architectural, Not Contractual',
    category: 'TECHNICAL',
    published: '2026-04-11',
    excerpt:
      'Code escrow, bankruptcy-remote SPVs, and multi-year survival clauses keep a vendor operating through distress. None of them keeps a verification artifact independently checkable once the vendor is gone. Verifiability has to be architectural, not contractual.',
  },
  {
    slug: 'build-in-house',
    file: "Article 4 — Couldn't We Just Build This In-House?.md",
    title: "Couldn't We Just Build This In-House?",
    category: 'ARGUMENT',
    published: '2026-04-04',
    excerpt:
      'Sophisticated funds build in-house by default, and that default is usually right. The narrow ground on which a verification primitive is the exception — not the rule — is where the case for a third party gets made or doesn’t.',
  },
  {
    slug: 'strategy-verification-maturity-model',
    file: 'Article 3 — Strategy Verification Maturity Model.md',
    title: 'Strategy Verification Maturity Model',
    category: 'FRAMEWORK',
    published: '2026-03-28',
    excerpt:
      'A maturity model earns its keep when practitioners read the levels and see their own work in them. A four-level model for strategy verification, calibrated to current allocator practice rather than what tooling makes possible.',
  },
  {
    slug: 'tees-sub-turing-language',
    file: 'Article 2 — Why TEEs + a Sub-Turing Language.md',
    title: 'Why TEEs + a Sub-Turing Language',
    category: 'TECHNICAL',
    published: '2026-03-21',
    excerpt:
      'A Trusted Execution Environment attests the binary, not the behaviour. A sub-Turing specification language closes the gap between what the silicon proves and what an allocator actually wants to know.',
  },
  {
    slug: 'proof-execution-gap',
    file: 'Article 1 — The Proof-Execution Gap.md',
    title: 'The Proof-Execution Gap',
    category: 'CONCEPT',
    published: '2026-03-14',
    excerpt:
      'Capital allocation depends on claims that cannot be independently verified without exposing the strategy that produced them. The pattern is structural rather than behavioural — a verification dead-end the industry has quietly agreed to call due diligence.',
  },
];

// --- Markdown setup ---------------------------------------------------------

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
}).use(footnotePlugin);

// Render external links with target=_blank rel=noopener.
const defaultLinkOpen = md.renderer.rules.link_open ||
  function (tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
  };
md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  const token = tokens[idx];
  const hrefIdx = token.attrIndex('href');
  if (hrefIdx >= 0) {
    const href = token.attrs[hrefIdx][1];
    if (/^https?:\/\//i.test(href) && !href.startsWith(SITE_ORIGIN)) {
      token.attrSet('target', '_blank');
      token.attrSet('rel', 'noopener');
    }
  }
  return defaultLinkOpen(tokens, idx, options, env, self);
};

// --- Helpers ----------------------------------------------------------------

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function readArticleBody(file) {
  const raw = fs.readFileSync(path.join(ARTICLES_DIR, file), 'utf8');
  // Strip leading H1 (article title) — page H1 lives in the article header block.
  const lines = raw.split(/\r?\n/);
  let i = 0;
  // Skip blank lines
  while (i < lines.length && lines[i].trim() === '') i++;
  // Skip H1
  if (i < lines.length && lines[i].startsWith('# ')) {
    i++;
    while (i < lines.length && lines[i].trim() === '') i++;
  }
  // The remaining markdown.
  return lines.slice(i).join('\n');
}

function renderArticleHtml(article, allArticles) {
  const body = readArticleBody(article.file);
  const renderedBody = md.render(body);

  // markdown-it-footnote renders <section class="footnotes"> at the end of the
  // body. We split it out so we can present it under our own "Notes" heading.
  let articleBody = renderedBody;
  let notesHtml = '';
  const footnoteSectionMatch = renderedBody.match(
    /<hr class="footnotes-sep">[\s\S]*?<section class="footnotes">([\s\S]*?)<\/section>/
  );
  if (footnoteSectionMatch) {
    articleBody = renderedBody
      .replace(/<hr class="footnotes-sep">[\s\S]*?<\/section>\s*$/, '')
      .trim();
    notesHtml = footnoteSectionMatch[1];
  }

  // "More writing" cards: 3 most recent excluding current.
  const others = allArticles.filter((a) => a.slug !== article.slug).slice(0, 3);

  const moreCards = others
    .map(
      (a) => `
        <a class="article-card" href="/writing/${a.slug}/">
          <p class="article-card__meta">${a.published} · ${a.category}</p>
          <h3 class="article-card__title">${escapeHtml(a.title)}</h3>
          <p class="article-card__excerpt">${escapeHtml(a.excerpt)}</p>
        </a>`
    )
    .join('');

  const notesSection = notesHtml
    ? `
  <section class="article-notes" id="notes" aria-label="Notes">
    <h2>Notes</h2>
    <div class="article-notes__list">
      ${notesHtml.trim()}
    </div>
  </section>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(article.title)} — Lintel Standard</title>
<meta name="description" content="${escapeHtml(article.excerpt)}">
<link rel="canonical" href="${SITE_ORIGIN}/writing/${article.slug}/">

<meta property="og:type" content="article">
<meta property="og:title" content="${escapeHtml(article.title)}">
<meta property="og:description" content="${escapeHtml(article.excerpt)}">
<meta property="og:url" content="${SITE_ORIGIN}/writing/${article.slug}/">
<meta property="og:image" content="${SITE_ORIGIN}/assets/compressed/open_graph.jpg">
<meta property="article:published_time" content="${article.published}">
<meta property="article:modified_time" content="${article.published}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(article.title)}">
<meta name="twitter:description" content="${escapeHtml(article.excerpt)}">
<meta name="twitter:image" content="${SITE_ORIGIN}/assets/compressed/open_graph.jpg">

<link rel="icon" href="/assets/favicon/favicon.ico" sizes="any">
<link rel="icon" href="/assets/favicon/favicon-96x96.png" type="image/png" sizes="96x96">
<link rel="apple-touch-icon" href="/assets/favicon/apple-touch-icon.png">
<link rel="manifest" href="/assets/favicon/site.webmanifest">
<link rel="preload" as="font" type="font/woff2" crossorigin href="/assets/fonts/inter/Inter-Subset.woff2">
<link rel="stylesheet" href="/assets/css/colors_and_type.css">
<link rel="stylesheet" href="/assets/css/site.css">
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>

<header class="header">
  <div class="header__inner">
    <a class="header__brand" href="/" aria-label="Lintel Standard, home">
      <img src="/assets/compressed/logo-wordmark.png" alt="Lintel Standard" width="120" height="64">
    </a>
    <button class="header__nav-toggle" type="button" aria-expanded="false" aria-controls="primary-nav">Menu</button>
    <nav id="primary-nav" class="header__nav" aria-label="Primary">
      <a href="/technology/">Technology</a>
      <a href="/writing/" aria-current="page">Writing</a>
      <a href="/about/">About</a>
    </nav>
    <div class="header__spacer"></div>
    <a class="header__cta" href="/contact/">Contact us</a>
  </div>
</header>

<main id="main">
  <article class="article">
    <nav class="article-breadcrumb" aria-label="Breadcrumb">
      <a href="/writing/">Writing</a>
      <span class="sep">/</span>
      <span>${escapeHtml(article.title)}</span>
    </nav>

    <header class="article-header">
      <p class="article-header__cat">${article.category}</p>
      <h1 class="article-header__h1">${escapeHtml(article.title)}</h1>
      <p class="article-meta">
        <a href="/about/">Kalle H. Fischer</a> — Founder, Lintel Standard
        · Published ${article.published}
      </p>
    </header>

    <div class="article-rule"><hr></div>

    <div class="article-body">
      ${articleBody}
    </div>
${notesSection}
  </article>

  <section class="section more-writing" aria-labelledby="more-writing-h">
    <div class="container">
      <div class="section-head">
        <p class="section-head__eyebrow">CONTINUE READING</p>
        <span class="section-head__bar" aria-hidden="true"></span>
        <h2 class="section-head__title" id="more-writing-h">More writing</h2>
      </div>
      <div class="article-grid">${moreCards}
      </div>
      <p class="see-all"><a href="/writing/">See all writing →</a></p>
    </div>
  </section>
</main>

<footer class="footer">
  <div class="footer__inner">
    <div class="footer__mark">
      <img src="/assets/compressed/logo-mark.png" alt="Lintel Standard" width="80" height="64">
    </div>
    <div class="footer__links">
      <a href="mailto:contact@lintelstandard.com">contact@lintelstandard.com</a>
      <a href="https://ssrn.com/abstract=6090766" target="_blank" rel="noopener">SSRN 6090766 — OVL</a>
      <a href="https://ssrn.com/abstract=6388459" target="_blank" rel="noopener">SSRN 6388459 — CVP</a>
      <a href="/trust/">Trust</a>
    </div>
    <div class="footer__copy">© 2026 Lintel Standard, Inc.</div>
  </div>
</footer>

<script>
  document.querySelector('.header__nav-toggle')?.addEventListener('click', function() {
    var nav = document.getElementById('primary-nav');
    var open = nav.dataset.open === 'true';
    nav.dataset.open = open ? 'false' : 'true';
    this.setAttribute('aria-expanded', open ? 'false' : 'true');
  });
</script>

</body>
</html>
`;
}

function build() {
  if (!fs.existsSync(WRITING_DIR)) fs.mkdirSync(WRITING_DIR, { recursive: true });

  ARTICLES.forEach((article) => {
    const html = renderArticleHtml(article, ARTICLES);
    const dir = path.join(WRITING_DIR, article.slug);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const outPath = path.join(dir, 'index.html');
    fs.writeFileSync(outPath, html, 'utf8');
    console.log(`✓ ${article.slug}/index.html`);
  });

  console.log(`\nBuilt ${ARTICLES.length} article pages.`);
}

build();
