#!/usr/bin/env node
/**
 * scripts/report-changes.js
 *
 * 每日同步「改动内容」推送。与 detect-release.js 互补:
 *   - detect-release.js 回答「今天要不要发版」(oasdiff 语义级,跨阈值才 true)
 *   - 本脚本回答「今天到底改了什么」(逐条列出,推给人看),不限于发版日
 *
 * 在 sync + manifest 之后、commit 之前运行(HEAD 仍指向上次 sync 的 spec),
 * 对比工作树与 HEAD,产出三类变更:
 *   - 新增 provider(HEAD 无 metadata.json)
 *   - 更新 spec(spec 内容 hash 变化;discovery/json 先做键序归一化,消除重排噪音)
 *   - 更新 overlay(overlay.yml 字节变化,人工维护)
 *   - 移除 provider(HEAD manifest 有、当前 manifest 无)
 *
 * 输出:
 *   - .sync-report.md(markdown,供 webhook / 存档)
 *   - stdout 摘要
 *   - 有 AVS_WEBHOOK_URL 时推送(调用 notify.js);无变更默认不推(设 AVS_REPORT_HEARTBEAT=1 则推「无变更」心跳)
 *
 * 不阻塞 sync,exit 0 always。
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { notify } = require('./notify');

const ROOT = path.resolve(__dirname, '..');
const SPEC_FILES = ['openapi.yml', 'openapi.json', 'discovery.json'];

function readJSON(rel) {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')); }
  catch { return null; }
}
function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }

function gitShowHead(relPath) {
  try {
    return execSync(`git show HEAD:${relPath}`, {
      cwd: ROOT, encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 128 * 1024 * 1024,
    });
  } catch { return null; }
}

function utcDate() {
  const d = new Date(), p = n => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

// 递归键排序归一化(数组保序),消除 google-discovery 的键序重排噪音
function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v).sort()) o[k] = sortKeys(v[k]);
    return o;
  }
  return v;
}
function normalizeJSON(text) {
  try { return JSON.stringify(sortKeys(JSON.parse(text))); } catch { return text; }
}

function findSpecFile(relDir) {
  for (const f of SPEC_FILES) if (exists(`${relDir}/${f}`)) return f;
  return null;
}

function shortHash(h) {
  if (!h) return '∅';
  return String(h).replace(/^sha256:/, '').slice(0, 8);
}

// ── 收集变更 ──────────────────────────────────────────────────────────────────

function collect() {
  const added = [], updatedSpec = [], updatedOverlay = [], removed = [];
  const upstreamDir = path.join(ROOT, 'upstream');
  if (!fs.existsSync(upstreamDir)) return { added, updatedSpec, updatedOverlay, removed };

  for (const proto of fs.readdirSync(upstreamDir).sort()) {
    const protoDir = path.join(upstreamDir, proto);
    if (!fs.statSync(protoDir).isDirectory()) continue;
    for (const prov of fs.readdirSync(protoDir).sort()) {
      const relDir = `upstream/${proto}/${prov}`;
      if (!fs.statSync(path.join(ROOT, relDir)).isDirectory()) continue;
      const key = `${proto}/${prov}`;

      const headMeta = gitShowHead(`${relDir}/metadata.json`);
      const curMeta = readJSON(`${relDir}/metadata.json`);
      const isNew = headMeta === null;

      const specFile = findSpecFile(relDir);

      if (isNew) {
        added.push({
          key,
          kind: curMeta?.kind === 'overlay' ? 'overlay' : 'spec',
          hash: shortHash(curMeta?.hash),
        });
        continue;
      }

      if (specFile) {
        // spec 类:比 spec 内容 hash(discovery/json 先归一化消噪)
        const relSpec = `${relDir}/${specFile}`;
        const headSpec = gitShowHead(relSpec);
        const curSpec = fs.readFileSync(path.join(ROOT, relSpec), 'utf8');
        if (headSpec !== null) {
          let changed;
          if (specFile.endsWith('.json')) {
            changed = normalizeJSON(headSpec) !== normalizeJSON(curSpec);
          } else {
            changed = headSpec !== curSpec;
          }
          if (changed) {
            const oldHash = shortHash((JSON.parse(headMeta) || {}).hash);
            const newHash = shortHash(curMeta?.hash);
            updatedSpec.push({ key, oldHash, newHash });
          }
        }
      } else {
        // overlay 类:比 overlay.yml 字节
        const relOv = `${relDir}/overlay.yml`;
        const headOv = gitShowHead(relOv);
        const curOv = exists(relOv) ? fs.readFileSync(path.join(ROOT, relOv), 'utf8') : null;
        if (headOv !== null && curOv !== null && headOv !== curOv) {
          updatedOverlay.push({ key });
        }
      }
    }
  }

  // 移除:对比 HEAD manifest 与当前 manifest 的 key 集
  const headManifest = gitShowHead('manifest.json');
  const curManifest = readJSON('manifest.json');
  if (headManifest && curManifest) {
    try {
      const headKeys = Object.keys(JSON.parse(headManifest).upstream || {});
      const curKeys = new Set(Object.keys(curManifest.upstream || {}));
      for (const k of headKeys) if (!curKeys.has(k)) removed.push({ key: k });
    } catch {}
  }

  return { added, updatedSpec, updatedOverlay, removed };
}

// ── 渲染 markdown ─────────────────────────────────────────────────────────────

function render({ added, updatedSpec, updatedOverlay, removed }) {
  const total = added.length + updatedSpec.length + updatedOverlay.length + removed.length;
  const lines = [`# 📦 ai-vendor-specs 每日同步 · ${utcDate()}`, ''];
  if (total === 0) {
    lines.push('今日上游无实质变更(已过滤时间戳 / discovery 键序噪音)。');
    return { total, md: lines.join('\n') };
  }
  lines.push(`共 **${total}** 项变更:`, '');
  if (updatedSpec.length) {
    lines.push(`## 🔄 spec 更新 (${updatedSpec.length})`);
    for (const c of updatedSpec) lines.push(`- \`avs://${c.key}\` — hash \`${c.oldHash}\` → \`${c.newHash}\``);
    lines.push('');
  }
  if (added.length) {
    lines.push(`## ➕ 新增 (${added.length})`);
    for (const c of added) lines.push(`- \`avs://${c.key}\` — ${c.kind}${c.kind === 'spec' ? ` (hash \`${c.hash}\`)` : ''}`);
    lines.push('');
  }
  if (updatedOverlay.length) {
    lines.push(`## ✍️ overlay 更新 (${updatedOverlay.length})`);
    for (const c of updatedOverlay) lines.push(`- \`avs://${c.key}\` — overlay.yml 人工更新`);
    lines.push('');
  }
  if (removed.length) {
    lines.push(`## ➖ 移除 (${removed.length})`);
    for (const c of removed) lines.push(`- \`avs://${c.key}\``);
    lines.push('');
  }
  return { total, md: lines.join('\n').trim() };
}

// ── main ─────────────────────────────────────────────────────────────────────

(async () => {
  const { total, md } = render(collect());
  fs.writeFileSync(path.join(ROOT, '.sync-report.md'), md + '\n');
  console.log(md);

  const heartbeat = process.env.AVS_REPORT_HEARTBEAT === '1';
  if (total === 0 && !heartbeat) {
    console.log('\n⏭  无变更,跳过推送(设 AVS_REPORT_HEARTBEAT=1 可推心跳)');
    return;
  }
  const r = await notify(md);
  console.log(r.sent ? '\n✅ 已推送改动日报' : `\n⏭  未推送: ${r.reason}`);
})();
