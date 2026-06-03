#!/usr/bin/env node
/**
 * scripts/detect-release.js
 *
 * 判断每日 sync 后上游是否出现"真实语义变更",有则算出日期版本号并产出发版决策。
 *
 * 为什么不用裸 hash:metadata.json 每次 sync 都重写 lastSynced(时间戳噪音),
 * gemini/vertex discovery.json 还会重排对象键序(字节变、语义没变)。两者都会让
 * 文件 hash 变化,但都不是真实变更。所以分两类做语义比较:
 *
 *   1. OpenAPI 格式(openapi.yml|json):oasdiff changelog 旧↔新,空 = 无变更;
 *      非空按 level 分级(1=INFO/新增, 2=WARN/注意, 3=ERR/破坏)。
 *   2. discovery 格式(discovery.json,specFormat=google-discovery):递归对象键排序
 *      归一化后比较,相等 = 键序重排噪音,不等 = 真实变更(无法廉价判破坏性)。
 *   3. 仅 overlay.yml 的目录(无独立 spec):跳过(其改动来自人工 commit,不是 sync)。
 *
 * 旧版本来自 `git show HEAD:<path>`(上次 commit 的 spec),新版本是工作树文件。
 * 因此本脚本必须在 commit 之前、sync 之后运行。
 *
 * 输出:
 *   - GITHUB_OUTPUT:release=true|false、version=1.YYYYMMDD.<patch>、digest=<单行摘要>
 *   - .release-notes.md(多行,按厂商分级),供 webhook / GitHub Release 用
 *   - stdout 摘要(本地可读)
 *
 * 不阻塞 sync,exit 0 always。
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PKG_NAME = require('../package.json').name;

const SPEC_FILES = ['openapi.yml', 'openapi.json', 'discovery.json'];

// ── helpers ──────────────────────────────────────────────────────────────────

function readJSON(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function utcDateCompact() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}`;
}

// 取 git HEAD 版本的文件内容;文件在 HEAD 不存在(新增 provider)返回 null
function gitShowHead(relPath) {
  try {
    return execSync(`git show HEAD:${relPath}`, {
      cwd: ROOT, encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 128 * 1024 * 1024,
    });
  } catch {
    return null;
  }
}

// 递归对象键排序归一化(数组保持原顺序),用于消除 discovery 的键序重排噪音
function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = sortKeys(v[k]);
    return out;
  }
  return v;
}

function normalizeJSON(text) {
  return JSON.stringify(sortKeys(JSON.parse(text)));
}

// oasdiff changelog 旧↔新。成功返回 { ok:true, changes:[{level}] };
// oasdiff 无法解析该 spec(如 azure-preview 的对象型 description)返回 { ok:false }。
function oasdiffChangelog(oldText, newAbsPath, tag) {
  const tmp = path.join(os.tmpdir(), `avs-old-${tag.replace(/\W+/g, '_')}-${process.pid}.spec`);
  fs.writeFileSync(tmp, oldText);
  try {
    const out = execSync(`oasdiff changelog "${tmp}" "${newAbsPath}" --format json`, {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 128 * 1024 * 1024,
    });
    return { ok: true, changes: JSON.parse(out.trim() || '[]') };
  } catch (e) {
    return { ok: false, error: (e.message || '').split('\n')[0] };
  } finally {
    try { fs.unlinkSync(tmp); } catch {}
  }
}

function findSpecFile(relDir) {
  for (const f of SPEC_FILES) if (exists(`${relDir}/${f}`)) return f;
  return null; // overlay-only,跳过
}

// ── 遍历所有 provider,收集语义变更 ─────────────────────────────────────────────

function detectChanges() {
  const changes = []; // { key, breaking, notable, added, unclassified, note }
  const upstreamDir = path.join(ROOT, 'upstream');
  if (!fs.existsSync(upstreamDir)) return changes;

  for (const proto of fs.readdirSync(upstreamDir).sort()) {
    const protoDir = path.join(upstreamDir, proto);
    if (!fs.statSync(protoDir).isDirectory()) continue;

    for (const prov of fs.readdirSync(protoDir).sort()) {
      const relDir = `upstream/${proto}/${prov}`;
      if (!fs.statSync(path.join(ROOT, relDir)).isDirectory()) continue;

      const specFile = findSpecFile(relDir);
      if (!specFile) continue; // 仅 overlay.yml,跳过

      const key = `${proto}/${prov}`;
      const relSpec = `${relDir}/${specFile}`;
      const newAbs = path.join(ROOT, relSpec);
      const oldText = gitShowHead(relSpec);

      // 新增 provider(HEAD 无此文件)→ 视为新增变更
      if (oldText === null) {
        changes.push({ key, breaking: 0, notable: 0, added: 1, unclassified: 0, note: '新增 provider' });
        continue;
      }

      const isDiscovery = specFile === 'discovery.json' ||
        (exists(`${relDir}/metadata.json`) && readJSON(`${relDir}/metadata.json`).specFormat === 'google-discovery');

      if (isDiscovery) {
        let changed;
        try {
          changed = normalizeJSON(oldText) !== normalizeJSON(fs.readFileSync(newAbs, 'utf8'));
        } catch {
          changed = oldText !== fs.readFileSync(newAbs, 'utf8'); // 解析失败回退裸字节比较
        }
        if (changed) {
          changes.push({ key, breaking: 0, notable: 0, added: 0, unclassified: 1, note: '变更(未分级)' });
        }
      } else {
        const res = oasdiffChangelog(oldText, newAbs, key);
        if (res.ok) {
          const arr = res.changes;
          if (arr.length) {
            changes.push({
              key,
              breaking: arr.filter(x => x.level === 3).length,
              notable: arr.filter(x => x.level === 2).length,
              added: arr.filter(x => x.level === 1).length,
              unclassified: 0,
              note: '',
            });
          }
        } else {
          // oasdiff 无法解析该 spec(如 azure-preview)→ 回退字节比较,只在真改时报告。
          // 这类 spec 是版本钉死的,极少变;一旦变即视为真实发版。
          if (oldText !== fs.readFileSync(newAbs, 'utf8')) {
            changes.push({ key, breaking: 0, notable: 0, added: 0, unclassified: 1, note: '变更(oasdiff 无法解析,按字节判定)' });
          }
        }
      }
    }
  }
  return changes;
}

// ── 版本号(纯日期 1.YYYYMMDD.patch) ───────────────────────────────────────────

function computeVersion(date) {
  let patch = 0;
  try {
    const out = execSync(`npm view ${PKG_NAME} versions --json`, {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 16 * 1024 * 1024,
    });
    const versions = JSON.parse(out);
    const prefix = `1.${date}.`;
    const sameDay = (Array.isArray(versions) ? versions : [versions])
      .filter(v => typeof v === 'string' && v.startsWith(prefix))
      .map(v => parseInt(v.slice(prefix.length), 10))
      .filter(n => Number.isInteger(n));
    if (sameDay.length) patch = Math.max(...sameDay) + 1;
  } catch {
    // 离线 / 首次发布 / 包未发布过 → patch 0
  }
  return `1.${date}.${patch}`;
}

// ── 摘要 ──────────────────────────────────────────────────────────────────────

function providerSummary(c) {
  const parts = [];
  if (c.breaking) parts.push(`${c.breaking} 破坏`);
  if (c.notable) parts.push(`${c.notable} 注意`);
  if (c.added) parts.push(`${c.added} 新增`);
  if (c.unclassified) parts.push('变更');
  if (!parts.length && c.note) parts.push(c.note);
  return parts.join(', ');
}

// ── 输出 ──────────────────────────────────────────────────────────────────────

function setOutput(key, value) {
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
  }
}

function main() {
  const changes = detectChanges();
  const release = changes.length > 0;

  if (!release) {
    console.log('✅ 无真实语义变更,不发版(仅照常 commit 存档)');
    setOutput('release', 'false');
    return;
  }

  const date = utcDateCompact();
  const version = computeVersion(date);
  const digest = changes.map(c => `${c.key}: ${providerSummary(c)}`).join(' | ');

  // 单行 digest 进 GITHUB_OUTPUT(去掉可能的换行)
  setOutput('release', 'true');
  setOutput('version', version);
  setOutput('digest', digest.replace(/[\r\n]+/g, ' '));

  // 多行 release notes
  const hasBreaking = changes.some(c => c.breaking > 0);
  const notes = [
    `## v${version}`,
    '',
    hasBreaking ? '⚠️ 含**破坏性**上游变更' : '上游变更',
    '',
    ...changes.map(c => `- **${c.key}**: ${providerSummary(c)}`),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(ROOT, '.release-notes.md'), notes);

  console.log(`🚀 检测到语义变更 → 发版 v${version}`);
  console.log(`   ${digest}`);
}

main();
process.exit(0);
