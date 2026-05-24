#!/usr/bin/env node
/**
 * scripts/build-site.js
 *
 * Generates a static documentation site under site/ that renders every
 * upstream OpenAPI spec with Redoc.
 *
 * - spec-kind entries: the raw spec file is copied verbatim.
 * - overlay-kind entries: the overlay is resolved against its base via
 *   loadSpec(), producing a composed OpenAPI document.
 * - google-discovery format (Gemini/Vertex): Redoc cannot render Discovery
 *   directly; a notice page links to the raw JSON and to Google's
 *   reference docs.
 *
 * Output tree:
 *   site/
 *   ├── index.html                # vendor catalog
 *   ├── styles.css
 *   └── <protocol>/<provider>/
 *       ├── index.html            # Redoc viewer or Discovery notice
 *       └── spec.{yml,json}       # raw or resolved spec
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { loadSpec } = require('./overlay/apply');

const ROOT = path.resolve(__dirname, '..');
const SITE = path.join(ROOT, 'site');

function readJSON(rel) { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')); }
function writeSite(rel, content) {
  const full = path.join(SITE, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

const escapeHtml = s => String(s).replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

// ── HTML templates ───────────────────────────────────────────────────────

function indexHtml(manifest, entries) {
  const repo = manifest.repository || 'AIhubmix/ai-vendor-specs';

  // Tab counts grouped by protocol — preserves the same sort order as cards.
  const PROTOCOL_ORDER = ['openai', 'anthropic', 'cohere', 'gemini', 'vertex'];
  const counts = {};
  for (const e of entries) counts[e.protocol] = (counts[e.protocol] || 0) + 1;
  const protocols = [...PROTOCOL_ORDER.filter(p => counts[p]),
                     ...Object.keys(counts).filter(p => !PROTOCOL_ORDER.includes(p)).sort()];

  const tabs = [
    `<button class="tab is-active" data-protocol="all" type="button">All <span class="tab-count">${entries.length}</span></button>`,
    ...protocols.map(p => `<button class="tab" data-protocol="${escapeHtml(p)}" type="button">${escapeHtml(p)} <span class="tab-count">${counts[p]}</span></button>`),
  ].join('');

  const cards = entries.map(e => {
    // Badge dedup: overlay entries get [overlay] + [→ base]; spec entries get [spec] + [format].
    let secondBadge;
    if (e.kind === 'overlay' && e.base) {
      const baseShort = e.base.replace(/^avs:\/\//, '');
      secondBadge = `<span class="badge badge-base" title="overlay base">→ ${escapeHtml(baseShort)}</span>`;
    } else if (e.format) {
      secondBadge = `<span class="badge badge-format">${escapeHtml(e.format)}</span>`;
    } else {
      secondBadge = '';
    }
    return `    <a class="card" href="${escapeHtml(e.path)}/" data-protocol="${escapeHtml(e.protocol)}">
      <div class="card-key">${escapeHtml(e.key)}</div>
      <div class="card-name">${escapeHtml(e.displayName)}</div>
      <div class="card-badges">
        <span class="badge badge-${escapeHtml(e.kind)}">${escapeHtml(e.kind)}</span>
        ${secondBadge}
      </div>
      <svg class="card-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M17 7H8M17 7v9"/></svg>
    </a>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ai-vendor-specs · ${entries.length} upstreams</title>
<meta name="description" content="Curated official OpenAPI / Discovery specifications for major AI providers, with overlay support and daily upstream sync.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap">
<link rel="stylesheet" href="styles.css">
</head>
<body>
<header class="site-header">
  <div class="header-inner">
    <div class="brand">
      <h1>ai-vendor-specs</h1>
      <p class="tagline">Curated official OpenAPI / Discovery specifications for major AI providers — daily upstream sync with drift detection.</p>
    </div>
    <nav class="header-links" aria-label="Project links">
      <a href="https://github.com/${escapeHtml(repo)}" class="link">GitHub</a>
      <a href="https://www.npmjs.com/package/@aihubmix/ai-vendor-specs" class="link">npm</a>
      <a href="https://pypi.org/project/ai-vendor-specs/" class="link">PyPI</a>
      <a href="https://github.com/${escapeHtml(repo)}/blob/main/manifest.json" class="link">manifest.json</a>
    </nav>
  </div>
</header>

<section class="install" aria-label="Install commands">
  <div class="install-grid">
    <div class="install-card">
      <div class="install-label">JavaScript / Node</div>
      <pre><code>npm install @aihubmix/ai-vendor-specs</code></pre>
    </div>
    <div class="install-card">
      <div class="install-label">Python</div>
      <pre><code>pip install ai-vendor-specs</code></pre>
    </div>
    <div class="install-card">
      <div class="install-label">Direct (HTTP)</div>
      <pre><code>curl https://cdn.jsdelivr.net/gh/${escapeHtml(repo)}@main/manifest.json</code></pre>
    </div>
  </div>
</section>

<section class="catalog">
  <div class="catalog-head">
    <h2>Vendors</h2>
    <p class="catalog-sub">Each card opens a Redoc view. Overlays are composed at build time — you see the full combined spec.</p>
  </div>
  <nav class="tabs" role="tablist" aria-label="Filter by protocol">
    ${tabs}
  </nav>
  <div class="cards" id="cards">
${cards}
  </div>
  <p class="empty" hidden>No vendors match this protocol.</p>
</section>

<footer class="site-footer">
  <p>${entries.length} upstream API specifications · generated ${escapeHtml(manifest.generatedAt || '')}</p>
  <p>Rendered with <a href="https://github.com/Redocly/redoc">Redoc</a>. Sidebar labels normalized to <code>/path</code>. Google Discovery entries link to raw JSON and Google's reference docs. <span class="license">MIT</span></p>
</footer>

<script>
(function() {
  const tabs = document.querySelectorAll('.tab');
  const cards = document.querySelectorAll('.cards .card');
  const empty = document.querySelector('.empty');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const proto = tab.dataset.protocol;
      tabs.forEach(t => t.classList.toggle('is-active', t === tab));
      let visible = 0;
      cards.forEach(c => {
        const match = proto === 'all' || c.dataset.protocol === proto;
        c.hidden = !match;
        if (match) visible++;
      });
      if (empty) empty.hidden = visible !== 0;
    });
  });

  // Keyboard a11y: left/right arrow keys to move between tabs.
  const tabList = Array.from(tabs);
  tabList.forEach((tab, i) => {
    tab.addEventListener('keydown', (e) => {
      let next = null;
      if (e.key === 'ArrowRight') next = tabList[(i + 1) % tabList.length];
      else if (e.key === 'ArrowLeft') next = tabList[(i - 1 + tabList.length) % tabList.length];
      if (next) { next.focus(); next.click(); e.preventDefault(); }
    });
  });
})();
</script>
</body>
</html>
`;
}

function redocHtml(entry) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(entry.displayName)} · ai-vendor-specs</title>
<style>
  html, body { margin: 0; }
  body {
    font-family: "IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    padding-top: 44px;
  }
  .topbar {
    position: fixed;
    top: 0; left: 0; right: 0;
    height: 44px;
    z-index: 1000;
    background: rgba(255, 255, 255, 0.92);
    -webkit-backdrop-filter: saturate(180%) blur(8px);
    backdrop-filter: saturate(180%) blur(8px);
    border-bottom: 1px solid #e2e8f0;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 20px;
    font-size: 13px;
  }
  .topbar a {
    color: #475569;
    text-decoration: none;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 10px;
    margin-left: -10px;
    border-radius: 6px;
    transition: background 150ms ease, color 150ms ease;
  }
  .topbar a:hover { background: #f1f5f9; color: #0f172a; }
  .topbar code {
    color: #64748b;
    font-family: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace;
    font-size: 12px;
  }
</style>
</head>
<body>
<div class="topbar">
  <a href="../../">← All vendors</a>
  <code>avs://${escapeHtml(entry.protocol)}/${escapeHtml(entry.provider)}</code>
</div>
<redoc spec-url="${escapeHtml(entry.specFile)}"></redoc>
<script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
</body>
</html>
`;
}

// Sidebar label hygiene: both Redoc and Scalar hard-code `summary` as the
// sidebar label source, with no configurable override. To make the sidebar
// read like a clean route list (e.g. "/chat/completions") rather than walls
// of upstream marketing prose, we overwrite every operation's `summary` with
// just its path. Renderer-level method badges (GET/POST color chips) handle
// disambiguation between methods at the same path. The original `description`
// is left untouched and drives the main view.
const HTTP_METHODS = new Set(['get','post','put','delete','patch','options','head','trace']);

function normalizeSummaries(spec) {
  if (!spec || typeof spec !== 'object' || !spec.paths) return spec;
  for (const [pathKey, ops] of Object.entries(spec.paths)) {
    if (!ops || typeof ops !== 'object') continue;
    for (const [method, op] of Object.entries(ops)) {
      if (!HTTP_METHODS.has(method)) continue;
      if (!op || typeof op !== 'object') continue;
      op.summary = pathKey;
    }
  }
  return spec;
}

function discoveryNoticeHtml(entry, googleDocsUrl) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(entry.displayName)} · ai-vendor-specs</title>
<link rel="stylesheet" href="../../styles.css">
</head>
<body>
<header>
  <h1>${escapeHtml(entry.displayName)}</h1>
  <p class="sub"><code>avs://${escapeHtml(entry.protocol)}/${escapeHtml(entry.provider)}</code> · Google Discovery format</p>
  <p class="links"><a href="../../">← All vendors</a></p>
</header>
<main class="notice">
  <h2>Google Discovery format</h2>
  <p>This upstream publishes its API in <a href="https://developers.google.com/discovery/v1/reference">Google Discovery</a> format, which Redoc does not render natively. The raw document is available below; Google also maintains an official reference site.</p>
  <ul>
    <li><a href="./${escapeHtml(entry.specFile)}">Raw Discovery JSON</a></li>
    <li><a href="${googleDocsUrl}">Official Google reference</a></li>
  </ul>
  <p class="hint">A Discovery&nbsp;→&nbsp;OpenAPI converter is on the roadmap; this page will be replaced by a Redoc view once it lands.</p>
</main>
</body>
</html>
`;
}

function stylesheet() { return `
/* ── Design tokens (Minimalism / Swiss + GitHub-Vercel palette) ─────────── */
:root {
  --color-bg: #f8fafc;
  --color-surface: #ffffff;
  --color-surface-2: #f1f5f9;
  --color-border: #e2e8f0;
  --color-border-strong: #cbd5e1;
  --color-text: #0f172a;
  --color-text-secondary: #475569;
  --color-text-muted: #64748b;
  --color-accent: #2563eb;
  --color-accent-bg: #eff6ff;
  --color-accent-border: #bfdbfe;
  --color-overlay: #ca8a04;
  --color-overlay-bg: #fefce8;
  --color-overlay-border: #fde68a;
  --color-manual: #b91c1c;
  --color-manual-bg: #fef2f2;
  --color-manual-border: #fecaca;

  --font-sans: "IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;

  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-pill: 999px;

  --shadow-card: 0 1px 0 rgba(15, 23, 42, 0.04);
  --shadow-card-hover: 0 4px 16px -4px rgba(15, 23, 42, 0.08);

  --max-w: 1200px;
}

* { box-sizing: border-box; }

html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  font-family: var(--font-sans);
  background: var(--color-bg);
  color: var(--color-text);
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

a { color: var(--color-accent); text-decoration: none; }
a:hover { text-decoration: underline; }

code, pre { font-family: var(--font-mono); }

/* ── Header ─────────────────────────────────────────────────────────────── */
.site-header {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}
.header-inner {
  max-width: var(--max-w);
  margin: 0 auto;
  padding: 56px 32px 32px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.brand h1 {
  margin: 0 0 10px;
  font-size: 36px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.1;
}
.tagline {
  margin: 0;
  font-size: 17px;
  color: var(--color-text-secondary);
  max-width: 680px;
  line-height: 1.55;
}
.header-links {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 0;
}
.header-links .link {
  font-size: 14px;
  color: var(--color-text-secondary);
  padding: 4px 12px;
  border-radius: var(--radius-pill);
  transition: color 200ms ease, background 200ms ease;
}
.header-links .link + .link { margin-left: 4px; }
.header-links .link:hover {
  background: var(--color-surface-2);
  color: var(--color-accent);
  text-decoration: none;
}

/* ── Install ────────────────────────────────────────────────────────────── */
.install {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}
.install-grid {
  max-width: var(--max-w);
  margin: 0 auto;
  padding: 24px 32px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.install-card {
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  transition: border-color 200ms ease, background 200ms ease;
}
.install-card:hover {
  border-color: var(--color-border-strong);
  background: var(--color-surface);
}
.install-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  margin-bottom: 8px;
}
.install-card pre {
  margin: 0;
  font-size: 13px;
  overflow-x: auto;
  scrollbar-width: thin;
}
.install-card code { color: var(--color-text); }

/* ── Catalog ────────────────────────────────────────────────────────────── */
.catalog {
  max-width: var(--max-w);
  margin: 0 auto;
  padding: 40px 32px 24px;
}
.catalog-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.catalog-head h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.catalog-sub {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-muted);
  max-width: 540px;
}

/* ── Tabs ───────────────────────────────────────────────────────────────── */
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
}
.tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  padding: 6px 14px;
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background 200ms ease, color 200ms ease, border-color 200ms ease;
}
.tab:hover {
  background: var(--color-surface-2);
  color: var(--color-text);
}
.tab:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
.tab.is-active {
  background: var(--color-text);
  color: #fff;
}
.tab-count {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  padding: 1px 6px;
  border-radius: var(--radius-pill);
  background: rgba(15, 23, 42, 0.08);
  color: inherit;
}
.tab.is-active .tab-count {
  background: rgba(255, 255, 255, 0.18);
}

/* ── Cards ──────────────────────────────────────────────────────────────── */
.cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.card {
  position: relative;
  display: block;
  padding: 18px 18px 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  color: inherit;
  box-shadow: var(--shadow-card);
  transition: border-color 200ms ease, box-shadow 200ms ease, transform 200ms ease;
}
.card[hidden] { display: none !important; }
.card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-card-hover);
  text-decoration: none;
}
.card:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
.card-key {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text-muted);
  margin-bottom: 6px;
  letter-spacing: 0.01em;
}
.card-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 14px;
  line-height: 1.35;
}
.card-badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.card-arrow {
  position: absolute;
  top: 18px;
  right: 18px;
  color: var(--color-text-muted);
  opacity: 0;
  transform: translate(-2px, 2px);
  transition: opacity 200ms ease, transform 200ms ease, color 200ms ease;
}
.card:hover .card-arrow {
  opacity: 1;
  transform: translate(0, 0);
  color: var(--color-accent);
}

/* ── Badges ─────────────────────────────────────────────────────────────── */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  border: 1px solid transparent;
  white-space: nowrap;
}
.badge-spec    { background: var(--color-accent-bg);  color: var(--color-accent);  border-color: var(--color-accent-border); }
.badge-overlay { background: var(--color-overlay-bg); color: var(--color-overlay); border-color: var(--color-overlay-border); }
.badge-manual  { background: var(--color-manual-bg);  color: var(--color-manual);  border-color: var(--color-manual-border); }
.badge-format {
  background: var(--color-surface-2);
  color: var(--color-text-muted);
  border-color: var(--color-border);
  text-transform: none;
  font-family: var(--font-mono);
  font-weight: 500;
}
.badge-base {
  background: transparent;
  color: var(--color-text-muted);
  border-color: var(--color-border);
  text-transform: none;
  font-family: var(--font-mono);
  font-weight: 500;
}

/* ── Empty state ────────────────────────────────────────────────────────── */
.empty {
  margin: 24px 0;
  padding: 24px;
  text-align: center;
  color: var(--color-text-muted);
  font-size: 14px;
  background: var(--color-surface);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
}

/* ── Footer ─────────────────────────────────────────────────────────────── */
.site-footer {
  max-width: var(--max-w);
  margin: 0 auto;
  padding: 32px 32px 56px;
  color: var(--color-text-muted);
  font-size: 13px;
  border-top: 1px solid var(--color-border);
  margin-top: 32px;
}
.site-footer p { margin: 0 0 6px; }
.site-footer code {
  background: var(--color-surface-2);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  font-size: 12px;
}
.license {
  font-family: var(--font-mono);
  font-size: 11px;
  padding: 1px 6px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
}

/* ── Notice page (Discovery format) ─────────────────────────────────────── */
main.notice {
  max-width: 720px;
  margin: 32px auto;
  padding: 28px 32px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}
main.notice h2 { margin-top: 0; font-weight: 600; }
main.notice .hint { color: var(--color-text-muted); font-size: 13px; font-style: italic; }
header .sub { color: var(--color-text-muted); margin: 0 0 12px; font-size: 14px; }
header .links { margin: 0; font-size: 14px; }

/* ── Responsive ─────────────────────────────────────────────────────────── */
@media (max-width: 900px) {
  .install-grid { grid-template-columns: 1fr; }
  .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 600px) {
  .header-inner, .catalog, .site-footer { padding-left: 20px; padding-right: 20px; }
  .install-grid { padding-left: 20px; padding-right: 20px; }
  .brand h1 { font-size: 28px; }
  .tagline { font-size: 15px; }
  .cards { grid-template-columns: 1fr; }
  .catalog-head { flex-direction: column; align-items: flex-start; gap: 6px; }
}

/* ── Motion respect ─────────────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
`; }

// ── Discovery 文档链接 (硬编码,Google's docs URL 不在 metadata 里) ──────

const DISCOVERY_DOCS = {
  'gemini/official': 'https://ai.google.dev/api/rest',
  'vertex/official': 'https://cloud.google.com/vertex-ai/docs/reference/rest',
};

// ── 主流程 ───────────────────────────────────────────────────────────────

function main() {
  if (fs.existsSync(SITE)) fs.rmSync(SITE, { recursive: true });
  fs.mkdirSync(SITE, { recursive: true });

  const manifest = readJSON('manifest.json');
  const entries = [];

  process.env.AVS_ROOT = ROOT;

  for (const [key, m] of Object.entries(manifest.upstream)) {
    const [protocol, provider] = key.split('/');
    const dir = `${protocol}/${provider}`;
    const meta = readJSON(`upstream/${dir}/metadata.json`);

    let specFile = null;
    const isDiscovery = m.specFormat === 'google-discovery';

    try {
      if (m.kind === 'spec') {
        const src = path.join(ROOT, m.specPath);
        const ext = path.extname(m.specPath);
        specFile = `spec${ext}`;
        const dst = path.join(SITE, dir, specFile);
        fs.mkdirSync(path.dirname(dst), { recursive: true });

        if (isDiscovery) {
          // Discovery format: not rendered by Redoc; copy raw for notice page link.
          fs.copyFileSync(src, dst);
        } else {
          // OpenAPI: parse → normalize summaries to path → serialize back.
          const content = fs.readFileSync(src, 'utf8');
          const isJson = ext === '.json' || content.trimStart().startsWith('{');
          const parsed = isJson ? JSON.parse(content) : yaml.load(content);
          normalizeSummaries(parsed);
          const out = isJson
            ? JSON.stringify(parsed, null, 2)
            : yaml.dump(parsed, { lineWidth: 200, noRefs: true });
          fs.writeFileSync(dst, out);
        }
      } else if (m.kind === 'overlay') {
        const resolved = loadSpec(`avs://${key}`);
        normalizeSummaries(resolved);
        writeSite(`${dir}/spec.yml`, yaml.dump(resolved, { lineWidth: 200, noRefs: true }));
        specFile = 'spec.yml';
      }
    } catch (e) {
      console.warn(`⚠️ ${key}: ${e.message} — skipping`);
      continue;
    }

    if (!specFile) continue;

    const entry = {
      key,
      path: dir,
      kind: m.kind,
      format: m.specFormat || null,
      base: m.base || null,
      protocol,
      provider,
      displayName: meta.displayName || key,
      specFile,
    };
    entries.push(entry);

    const html = isDiscovery
      ? discoveryNoticeHtml(entry, DISCOVERY_DOCS[key] || 'https://developers.google.com/discovery')
      : redocHtml(entry);
    writeSite(`${dir}/index.html`, html);
  }

  // Sort: protocol order first (openai → anthropic → cohere → gemini → vertex → others),
  // within each protocol: "official" first, then alphabetical.
  const PROTOCOL_ORDER = ['openai', 'anthropic', 'cohere', 'gemini', 'vertex'];
  entries.sort((a, b) => {
    const pa = PROTOCOL_ORDER.indexOf(a.protocol);
    const pb = PROTOCOL_ORDER.indexOf(b.protocol);
    const oa = pa === -1 ? 99 : pa;
    const ob = pb === -1 ? 99 : pb;
    if (oa !== ob) return oa - ob;
    if (a.provider === 'official') return -1;
    if (b.provider === 'official') return 1;
    return a.provider.localeCompare(b.provider);
  });

  writeSite('index.html', indexHtml(manifest, entries));
  writeSite('styles.css', stylesheet());

  console.log(`✅ site/ built · ${entries.length} entries`);
  console.log(`   preview: npx serve site/  or  python3 -m http.server -d site 8000`);
}

main();
