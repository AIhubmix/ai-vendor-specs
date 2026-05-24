#!/usr/bin/env node
/**
 * scripts/check-drift.js
 *
 * 检测 upstream spec 是否出现"我们没感知到的变化":
 *
 *   1. 版本钉死类(如 openai/azure, openai/azure-preview):查上游 GitHub 目录,
 *      若出现比钉死版本更新的版本,提示人评估
 *   2. overlay 类(如 anthropic/bedrock):检查 lastReviewed 是否超 90 天;
 *      并跑一遍 resolver 看 base+overlay 能否成功合成
 *   3. 全部条目:校验 sync 后没遗留 download_spec 失败的占位文件(如 "404: Not Found")
 *
 * 输出:
 *   - stdout 摘要
 *   - .drift-report.md  (cron commit 时一并 push,git 历史可追溯)
 *
 * 不阻塞 sync,只报告。exit 0 always。
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { loadSpec } = require('./overlay/apply');
const { notify } = require('./notify');

const ROOT = path.resolve(__dirname, '..');
const STALE_DAYS = 90;

// ── 版本追踪配置(hardcoded) ───────────────────────────────────────────────────

const versionTrackers = {
  'openai/azure': {
    githubListing: 'repos/Azure/azure-rest-api-specs/contents/specification/cognitiveservices/data-plane/AzureOpenAI/inference/stable',
    pinnedVersion: '2024-10-21',
    syncScript: 'scripts/sync/openai-azure.sh',
  },
  'openai/azure-preview': {
    githubListing: 'repos/Azure/azure-rest-api-specs/contents/specification/cognitiveservices/data-plane/AzureOpenAI/inference/preview',
    pinnedVersion: '2025-04-01-preview',
    syncScript: 'scripts/sync/openai-azure-preview.sh',
  },
};

// ── helpers ──────────────────────────────────────────────────────────────────

function readJSON(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function ghAPI(endpoint) {
  return new Promise((resolve, reject) => {
    const headers = {
      'User-Agent': 'ai-vendor-specs-drift-check',
      'Accept': 'application/vnd.github.v3+json',
    };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    https.get(`https://api.github.com/${endpoint}`, { headers }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
        } else {
          reject(new Error(`GitHub API ${res.statusCode}: ${data.slice(0, 200)}`));
        }
      });
    }).on('error', reject);
  });
}

function daysSince(isoDate) {
  const then = new Date(isoDate).getTime();
  const now = Date.now();
  return Math.floor((now - then) / (24 * 60 * 60 * 1000));
}

// ── 三类检查 ──────────────────────────────────────────────────────────────────

async function checkVersionTrackers() {
  const results = [];
  for (const [key, cfg] of Object.entries(versionTrackers)) {
    try {
      const list = await ghAPI(cfg.githubListing);
      const versions = list.map(x => x.name).sort();
      const latest = versions[versions.length - 1];
      if (latest !== cfg.pinnedVersion) {
        results.push({
          level: 'warn',
          entry: key,
          message: `上游有更新版本 \`${latest}\`,当前钉死 \`${cfg.pinnedVersion}\``,
          action: `若要升级:编辑 \`${cfg.syncScript}\` 改 \`AZURE_API_VERSION\` → \`${latest}\`,跑 \`npm run sync\``,
        });
      } else {
        results.push({
          level: 'ok',
          entry: key,
          message: `已钉到上游最新版 \`${cfg.pinnedVersion}\``,
        });
      }
    } catch (e) {
      results.push({
        level: 'error',
        entry: key,
        message: `version 检查失败:${e.message}`,
      });
    }
  }
  return results;
}

function checkOverlayStaleness() {
  const results = [];
  const upstreamDir = path.join(ROOT, 'upstream');
  if (!fs.existsSync(upstreamDir)) return results;

  for (const protocol of fs.readdirSync(upstreamDir)) {
    const protoDir = path.join(upstreamDir, protocol);
    if (!fs.statSync(protoDir).isDirectory()) continue;
    for (const provider of fs.readdirSync(protoDir)) {
      const provDir = path.join(protoDir, provider);
      const metaPath = path.join(provDir, 'metadata.json');
      if (!fs.existsSync(metaPath)) continue;
      const meta = readJSON(`upstream/${protocol}/${provider}/metadata.json`);
      if (meta.kind !== 'overlay') continue;

      const key = `${protocol}/${provider}`;
      if (!meta.lastReviewed) {
        results.push({
          level: 'warn',
          entry: key,
          message: '缺少 lastReviewed 字段,无法判断 overlay 新鲜度',
          action: `给 \`upstream/${protocol}/${provider}/metadata.json\` 加 \`lastReviewed: "YYYY-MM-DD"\` 字段`,
        });
        continue;
      }
      const days = daysSince(meta.lastReviewed);
      if (days > STALE_DAYS) {
        results.push({
          level: 'warn',
          entry: key,
          message: `overlay 已 ${days} 天未审阅(超过 ${STALE_DAYS} 天阈值)`,
          action: '核对以下文档是否仍与 overlay 一致;若改了则更新 overlay.yml,无变化则更新 lastReviewed:\n' +
            (meta.lastReviewedDocs || []).map(u => `      - ${u}`).join('\n'),
        });
      } else {
        results.push({
          level: 'ok',
          entry: key,
          message: `overlay 上次审阅 ${days} 天前,仍在 ${STALE_DAYS} 天窗口内`,
        });
      }
    }
  }
  return results;
}

function checkOverlayResolverHealth() {
  const results = [];
  const upstreamDir = path.join(ROOT, 'upstream');
  for (const protocol of fs.readdirSync(upstreamDir)) {
    const protoDir = path.join(upstreamDir, protocol);
    if (!fs.statSync(protoDir).isDirectory()) continue;
    for (const provider of fs.readdirSync(protoDir)) {
      const metaPath = path.join(protoDir, provider, 'metadata.json');
      if (!fs.existsSync(metaPath)) continue;
      const meta = readJSON(`upstream/${protocol}/${provider}/metadata.json`);
      if (meta.kind !== 'overlay') continue;

      const key = `${protocol}/${provider}`;
      try {
        process.env.AVS_ROOT = ROOT;
        const resolved = loadSpec(`avs://${key}`);
        if (!resolved || !resolved.openapi) {
          results.push({
            level: 'error',
            entry: key,
            message: 'resolver 跑通了但产物缺 openapi 字段',
          });
        } else {
          results.push({
            level: 'ok',
            entry: key,
            message: `overlay resolve 通过(${Object.keys(resolved.paths || {}).length} paths)`,
          });
        }
      } catch (e) {
        results.push({
          level: 'error',
          entry: key,
          message: `overlay resolve 失败:${e.message}`,
          action: '上游 base 可能引入了破坏 overlay 的字段变化。检查 overlay.yml 引用的 schema 名 / path 是否仍存在',
        });
      }
    }
  }
  return results;
}

function checkSpecFileSanity() {
  // 防 download_spec 写入 "404: Not Found" 之类的占位
  // 历史上 2026-02 ~ 2026-05 期间 cohere 就被这种东西污染了三个月
  const results = [];
  const upstreamDir = path.join(ROOT, 'upstream');
  const PLACEHOLDER_PATTERNS = [
    /^404:/i, /^not found/i, /^<!DOCTYPE html/i, /^<html/i, /^error:/i,
  ];
  for (const protocol of fs.readdirSync(upstreamDir)) {
    const protoDir = path.join(upstreamDir, protocol);
    if (!fs.statSync(protoDir).isDirectory()) continue;
    for (const provider of fs.readdirSync(protoDir)) {
      const provDir = path.join(protoDir, provider);
      for (const candidate of ['openapi.yml', 'openapi.json', 'discovery.json']) {
        const file = path.join(provDir, candidate);
        if (!fs.existsSync(file)) continue;
        const head = fs.readFileSync(file, 'utf8').slice(0, 200).trim();
        if (PLACEHOLDER_PATTERNS.some(re => re.test(head))) {
          results.push({
            level: 'error',
            entry: `${protocol}/${provider}`,
            message: `spec 文件被占位内容污染:\`${head.slice(0, 80)}\``,
            action: '上游 URL 可能失效,检查 sync 脚本',
          });
        }
      }
    }
  }
  return results;
}

// ── 主流程 ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔍 Drift check\n');

  const all = {
    version: await checkVersionTrackers(),
    overlayStaleness: checkOverlayStaleness(),
    overlayHealth: checkOverlayResolverHealth(),
    fileSanity: checkSpecFileSanity(),
  };

  // 渲染 markdown
  const lines = ['# Drift Report', '', `_Generated ${new Date().toISOString()}_`, ''];

  const buckets = { ok: [], warn: [], error: [] };
  for (const [section, items] of Object.entries(all)) {
    for (const r of items) buckets[r.level].push({ section, ...r });
  }

  const sectionLabel = {
    version:          '版本追踪',
    overlayStaleness: 'overlay 新鲜度',
    overlayHealth:    'overlay resolve 健康度',
    fileSanity:       'spec 文件完整性',
  };

  function render(level, icon) {
    if (!buckets[level].length) return;
    lines.push(`## ${icon} ${level.toUpperCase()} (${buckets[level].length})`, '');
    for (const r of buckets[level]) {
      lines.push(`- **\`${r.entry}\`**(${sectionLabel[r.section]})— ${r.message}`);
      if (r.action) lines.push(`    - 处置:${r.action}`);
    }
    lines.push('');
  }
  render('error', '❌');
  render('warn',  '⚠️');
  render('ok',    '✅');

  const report = lines.join('\n') + '\n';
  fs.writeFileSync(path.join(ROOT, '.drift-report.md'), report);

  // 控制台简短摘要
  const counts = { error: buckets.error.length, warn: buckets.warn.length, ok: buckets.ok.length };
  console.log(`错误 ${counts.error} / 提醒 ${counts.warn} / 正常 ${counts.ok}\n`);
  if (counts.error || counts.warn) {
    console.log('详细见 .drift-report.md\n');
    [...buckets.error, ...buckets.warn].forEach(r => {
      console.log(`  ${r.level === 'error' ? '❌' : '⚠️'} ${r.entry}: ${r.message}`);
    });
    console.log();

    // ── webhook 通知:仅在有 warn/error 时发,绿色日不打扰 ──────────────
    const today = new Date().toISOString().slice(0, 10);
    const statusIcon = counts.error ? '🔴' : '🟡';
    const msgLines = [
      `# ${statusIcon} ai-vendor-specs drift`,
      `**${today}** · ❌ ${counts.error} / ⚠️ ${counts.warn} / ✅ ${counts.ok}`,
      '',
    ];
    if (buckets.error.length) {
      msgLines.push('## ❌ 错误', '');
      for (const r of buckets.error) {
        msgLines.push(`- \`${r.entry}\` (${sectionLabel[r.section]}): ${r.message}`);
      }
      msgLines.push('');
    }
    if (buckets.warn.length) {
      msgLines.push('## ⚠️ 提醒', '');
      for (const r of buckets.warn) {
        msgLines.push(`- \`${r.entry}\` (${sectionLabel[r.section]}): ${r.message}`);
      }
      msgLines.push('');
    }
    msgLines.push('详情: https://github.com/AIhubmix/ai-vendor-specs/blob/main/.drift-report.md');

    const result = await notify(msgLines.join('\n'));
    if (result.sent) console.log('📤 webhook 已通知');
    else if (process.env.AVS_WEBHOOK_URL) console.log(`📭 webhook 失败: ${result.reason}`);
    // 没配 URL 时静默,不打 log
  }
}

if (require.main === module) {
  main().catch(e => { console.error('drift check 自身崩溃:', e); process.exit(0); });
}

module.exports = { main };
