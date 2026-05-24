#!/usr/bin/env node
/**
 * scripts/notify.js
 *
 * 通用 webhook 通知器。库 + CLI 两用。
 *
 * 配置(任选其一):
 *   - 环境变量 AVS_WEBHOOK_URL    实际 webhook URL
 *   - .env.local / .env(本仓库根) 同上,自动加载
 *
 * 类型自动识别(也可显式 AVS_WEBHOOK_TYPE=wxwork|slack|discord|generic):
 *   wxwork  qyapi.weixin.qq.com
 *   slack   hooks.slack.com
 *   discord discord.com/api/webhooks
 *   generic 兜底,POST {text, message}
 *
 * 未配置 URL 时静默 no-op,fork 用户零侵入。
 *
 * 用法(库):
 *   const { notify } = require('./notify');
 *   await notify('drift detected', { title: 'AVS Drift' });
 *
 * 用法(CLI):
 *   node scripts/notify.js "message text"
 *   echo "from pipe" | node scripts/notify.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = /^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    const [, key, valRaw] = m;
    if (process.env[key]) continue;  // 不覆盖已存在的
    const val = valRaw.replace(/^['"]|['"]$/g, '');
    process.env[key] = val;
  }
}
loadEnvFile(path.join(ROOT, '.env.local'));
loadEnvFile(path.join(ROOT, '.env'));

function detectType(url) {
  if (url.includes('qyapi.weixin.qq.com'))     return 'wxwork';
  if (url.includes('hooks.slack.com'))         return 'slack';
  if (url.includes('discord.com/api/webhooks')) return 'discord';
  return 'generic';
}

const senders = {
  wxwork: (url, msg) => ({
    url,
    body: { msgtype: 'markdown', markdown: { content: msg } },
  }),
  slack: (url, msg) => ({
    url,
    body: { text: msg, mrkdwn: true },
  }),
  discord: (url, msg) => ({
    url,
    body: { content: msg.slice(0, 2000) },  // discord 单条 2000 字上限
  }),
  generic: (url, msg) => ({
    url,
    body: { text: msg, message: msg },
  }),
};

/**
 * 发送通知。
 * @param {string} message  markdown 文本(各通道会自适应)
 * @param {object} [opts]
 * @param {string} [opts.url]   覆盖环境变量
 * @param {string} [opts.type]  覆盖自动识别
 * @returns {Promise<{sent: boolean, reason?: string}>}
 */
async function notify(message, opts = {}) {
  const url = opts.url || process.env.AVS_WEBHOOK_URL;
  if (!url) return { sent: false, reason: 'AVS_WEBHOOK_URL not set' };
  if (!message || !message.trim()) return { sent: false, reason: 'empty message' };

  const type = opts.type || process.env.AVS_WEBHOOK_TYPE || detectType(url);
  const sender = senders[type] || senders.generic;
  const { body } = sender(url, message);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { sent: false, reason: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    }
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: e.message };
  }
}

module.exports = { notify, detectType };

// CLI 模式
if (require.main === module) {
  (async () => {
    let msg = process.argv.slice(2).join(' ').trim();
    if (!msg && !process.stdin.isTTY) {
      msg = await new Promise(resolve => {
        let buf = '';
        process.stdin.on('data', c => { buf += c; });
        process.stdin.on('end', () => resolve(buf.trim()));
      });
    }
    if (!msg) {
      console.error('usage: node scripts/notify.js "message"  |  echo "msg" | node scripts/notify.js');
      process.exit(2);
    }
    const r = await notify(msg);
    if (r.sent) {
      console.log('✅ sent');
    } else {
      console.log(`⏭  skipped: ${r.reason}`);
    }
  })();
}
