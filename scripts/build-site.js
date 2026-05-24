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
  const cards = entries.map(e => {
    const meta = [
      `<span class="badge kind-${e.kind}">${e.kind}</span>`,
      `<span class="badge format">${e.format}</span>`,
    ].join('');
    return `    <a class="vendor" href="${e.path}/">
      <div class="key">${escapeHtml(e.key)}</div>
      <div class="name">${escapeHtml(e.displayName)}</div>
      <div class="meta">${meta}</div>
    </a>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ai-vendor-specs · ${entries.length} upstreams</title>
<meta name="description" content="Curated official OpenAPI / Discovery specifications for major AI providers, with overlay support and daily upstream sync.">
<link rel="stylesheet" href="styles.css">
</head>
<body>
<header>
  <h1>ai-vendor-specs</h1>
  <p class="tagline">Curated official OpenAPI / Discovery specifications for major AI providers — daily upstream sync with drift detection.</p>
  <p class="links">
    <a href="https://github.com/${escapeHtml(repo)}">GitHub</a> ·
    <a href="https://www.npmjs.com/package/@aihubmix/ai-vendor-specs">npm</a> ·
    <a href="https://pypi.org/project/ai-vendor-specs/">PyPI</a> ·
    <a href="https://github.com/${escapeHtml(repo)}/blob/main/manifest.json">manifest.json</a>
  </p>
</header>

<section class="install">
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
  <p class="quick-usage">
    Each entry below opens a Redoc-rendered view of the upstream spec.
    Overlays (Bedrock, OpenAI-compatible providers) are composed at build time —
    you see the full combined spec, not just the deltas.
  </p>
</section>

<main class="grid">
${cards}
</main>

<footer>
  <p>${entries.length} upstream API specifications · generated ${escapeHtml(manifest.generatedAt || '')}</p>
  <p>OpenAPI specs render via <a href="https://github.com/Redocly/redoc">Redoc</a>. Google Discovery entries link to raw JSON and Google's reference docs. License: MIT.</p>
</footer>
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
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .topbar { background: #fff; padding: 8px 16px; border-bottom: 1px solid #eee;
    display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
  .topbar a { color: #555; text-decoration: none; }
  .topbar a:hover { color: #000; }
  .topbar code { color: #888; }
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
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #fafafa;
  color: #222;
  line-height: 1.5;
}
header {
  padding: 48px 32px 24px;
  background: #fff;
  border-bottom: 1px solid #eee;
}
header h1 { margin: 0 0 8px; font-size: 32px; }
header .sub { color: #666; margin: 0 0 12px; font-size: 14px; }
header .tagline { color: #555; margin: 0 0 16px; font-size: 16px; max-width: 720px; }
header .links { margin: 0; font-size: 14px; }
header .links a { color: #0366d6; text-decoration: none; margin-right: 4px; }
header .links a:hover { text-decoration: underline; }

section.install {
  padding: 24px 32px;
  background: #fff;
  border-bottom: 1px solid #eee;
}
.install-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
  max-width: 1200px;
  margin: 0 auto;
}
.install-card {
  background: #f6f8fa;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  padding: 12px 14px;
}
.install-label {
  font-size: 12px;
  font-weight: 600;
  color: #57606a;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin-bottom: 6px;
}
.install-card pre {
  margin: 0;
  font-size: 13px;
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  overflow-x: auto;
  white-space: pre;
}
.install-card code { color: #24292f; }
.quick-usage {
  max-width: 1200px;
  margin: 16px auto 0;
  color: #57606a;
  font-size: 14px;
  line-height: 1.6;
}
main.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  padding: 32px;
  max-width: 1200px;
  margin: 0 auto;
}
.vendor {
  display: block;
  padding: 20px;
  background: #fff;
  border: 1px solid #e1e4e8;
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  transition: transform 80ms, box-shadow 80ms;
}
.vendor:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.06);
  border-color: #c8cdd2;
}
.vendor .key { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 13px; color: #555; margin-bottom: 6px; }
.vendor .name { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
.vendor .meta { display: flex; gap: 6px; flex-wrap: wrap; }
.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.kind-spec { background: #ddf4ff; color: #0969da; }
.kind-overlay { background: #fff8c5; color: #9a6700; }
.kind-manual { background: #ffe7e6; color: #a4101a; }
.badge.format { background: #f0f0f0; color: #555; }
footer {
  padding: 24px 32px 48px;
  color: #888;
  font-size: 13px;
  text-align: center;
}
footer a { color: #0366d6; }
main.notice {
  max-width: 720px;
  margin: 32px auto;
  padding: 24px 32px;
  background: #fff;
  border: 1px solid #e1e4e8;
  border-radius: 8px;
}
main.notice h2 { margin-top: 0; }
main.notice .hint { color: #888; font-size: 13px; font-style: italic; }
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
        fs.copyFileSync(src, dst);
      } else if (m.kind === 'overlay') {
        const resolved = loadSpec(`avs://${key}`);
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
      format: m.specFormat || 'overlay',
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

  writeSite('index.html', indexHtml(manifest, entries));
  writeSite('styles.css', stylesheet());

  console.log(`✅ site/ built · ${entries.length} entries`);
  console.log(`   preview: npx serve site/  or  python3 -m http.server -d site 8000`);
}

main();
