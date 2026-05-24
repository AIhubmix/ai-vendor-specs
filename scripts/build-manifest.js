#!/usr/bin/env node
/**
 * scripts/build-manifest.js
 *
 * 生成顶层 manifest.json,作为外部消费方的"发现入口"。
 * 扫描 upstream/ 下所有 metadata.json,生成统一索引 + 拉取 URL。
 *
 * 输出:./manifest.json
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function readJSON(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

// 从 package.json 读取 repo 信息
const pkg = readJSON('package.json');
const repoUrl = pkg.repository?.url || 'https://github.com/your-org/ai-vendor-specs.git';
const repoSlug = repoUrl.replace(/^.*github\.com[:/]/, '').replace(/\.git$/, '');
const branch = 'main';

function buildUrls(specPath) {
  return {
    rawUrl: `https://raw.githubusercontent.com/${repoSlug}/${branch}/${specPath}`,
    cdnUrl: `https://cdn.jsdelivr.net/gh/${repoSlug}@${branch}/${specPath}`,
  };
}

// 扫描 upstream/<protocol>/<provider>/
const upstream = {};
const protocolDirs = fs.readdirSync(path.join(ROOT, 'upstream'))
  .filter(d => fs.statSync(path.join(ROOT, 'upstream', d)).isDirectory());

for (const protocol of protocolDirs) {
  const providerDirs = fs.readdirSync(path.join(ROOT, 'upstream', protocol))
    .filter(d => fs.statSync(path.join(ROOT, 'upstream', protocol, d)).isDirectory());

  for (const provider of providerDirs) {
    const key = `${protocol}/${provider}`;
    const relDir = `upstream/${protocol}/${provider}`;
    const metaPath = `${relDir}/metadata.json`;
    if (!exists(metaPath)) {
      console.warn(`⚠️  ${key}: metadata.json missing, skip`);
      continue;
    }

    const meta = readJSON(metaPath);
    const entry = {
      protocol,
      provider,
      displayName: meta.displayName,
      hash: meta.hash || null,
      syncedAt: meta.lastSynced || meta.lastEdited || null,
    };

    if (meta.kind === 'overlay') {
      entry.kind = 'overlay';
      entry.base = meta.base;
      const overlayPath = `${relDir}/overlay.yml`;
      entry.overlayPath = overlayPath;
      entry.uri = `avs://${protocol}/${provider}`;
      Object.assign(entry, buildUrls(overlayPath));
    } else {
      entry.kind = 'spec';
      entry.specFormat = meta.specFormat;
      entry.sourceUrl = meta.source;
      // 定位 spec 文件名
      let specFile = null;
      for (const name of ['openapi.yml', 'openapi.json', 'discovery.json']) {
        if (exists(`${relDir}/${name}`)) { specFile = name; break; }
      }
      const specPath = `${relDir}/${specFile}`;
      entry.specPath = specPath;
      entry.uri = `avs://${protocol}/${provider}`;
      Object.assign(entry, buildUrls(specPath));
    }

    upstream[key] = entry;
  }
}

const manifest = {
  schemaVersion: 1,
  name: pkg.name || 'ai-vendor-specs',
  description: pkg.description,
  generatedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  repository: repoSlug,
  upstream,
  conventions: {
    uriProtocol: 'avs://<protocol>/<provider>[#<JSON-Pointer>]',
    resolverLib: 'scripts/overlay/apply.js (CommonJS, exported via package main)',
    fetchPattern: {
      raw: `https://raw.githubusercontent.com/${repoSlug}/<branch-or-tag>/upstream/<protocol>/<provider>/openapi.yml`,
      cdn: `https://cdn.jsdelivr.net/gh/${repoSlug}@<branch-or-tag>/upstream/<protocol>/<provider>/openapi.yml`,
    },
  },
};

fs.writeFileSync(
  path.join(ROOT, 'manifest.json'),
  JSON.stringify(manifest, null, 2) + '\n'
);

console.log(`✅ manifest.json updated (${Object.keys(upstream).length} upstream entries)`);
