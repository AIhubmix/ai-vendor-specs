#!/usr/bin/env node
/**
 * scripts/overlay/apply.js
 *
 * avs:// 协议 resolver + overlay 应用器。
 * ai-vendor-specs 自身用它做 overlay 校验;消费方(如 aihubmix-openapi)用它做 build。
 *
 * 协议形式:
 *   avs://<protocol>/<provider>            整份 spec
 *   avs://<protocol>/<provider>#<pointer>  spec 内某节点 (JSON Pointer)
 *
 * Resolver 在 ai-vendor-specs 自身: 解析到 ./upstream/<protocol>/<provider>/
 * Resolver 在消费方:           解析到 ./node_modules/ai-vendor-specs/upstream/<protocol>/<provider>/
 *
 * 用法:
 *   const { resolve, applyOverlay, loadSpec } = require('ai-vendor-specs/scripts/overlay/apply');
 *   const fullSpec = await applyOverlay('avs://anthropic/bedrock');
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// ── 定位 ai-vendor-specs 仓库根 ─────────────────────────────────────────────────────

/**
 * 决定 ai-vendor-specs 数据根目录(upstream/ 的父目录)
 * - 如果 process.cwd() 自身就是 ai-vendor-specs(有 upstream/ 目录) → 用 cwd
 * - 如果 cwd 是消费方且有 node_modules/ai-vendor-specs → 用那个
 * - 也可通过环境变量 AVS_ROOT 显式指定
 */
function findAvsRoot(cwd = process.cwd()) {
  if (process.env.AVS_ROOT) {
    return process.env.AVS_ROOT;
  }
  // 1. cwd 自身就是 ai-vendor-specs
  if (fs.existsSync(path.join(cwd, 'upstream')) &&
      fs.existsSync(path.join(cwd, 'scripts/overlay/apply.js'))) {
    return cwd;
  }
  // 2. cwd 是消费方,有 node_modules/ai-vendor-specs
  const nm = path.join(cwd, 'node_modules/ai-vendor-specs');
  if (fs.existsSync(nm)) {
    return nm;
  }
  // 3. cwd 是消费方,有同级 ai-vendor-specs 目录(submodule 用法)
  const sibling = path.join(cwd, 'ai-vendor-specs');
  if (fs.existsSync(path.join(sibling, 'upstream'))) {
    return sibling;
  }
  throw new Error(
    'ai-vendor-specs root not found. Set AVS_ROOT or install ai-vendor-specs as a dependency.'
  );
}

// ── avs:// URI 解析 ─────────────────────────────────────────────────────

/**
 * 解析 avs:// URI 到具体文件路径 + JSON Pointer
 * 返回 { filePath, pointer, isOverlay }
 */
function parseURI(uri, root = findAvsRoot()) {
  const m = /^avs:\/\/([^/]+)\/([^#]+)(#.*)?$/.exec(uri);
  if (!m) throw new Error(`Invalid avs:// URI: ${uri}`);
  const [, protocol, provider, fragment] = m;
  const dir = path.join(root, 'upstream', protocol, provider);

  if (!fs.existsSync(dir)) {
    throw new Error(`avs:// URI ${uri} not found at ${dir}`);
  }

  // 文件优先级:openapi.yml > openapi.json > discovery.json > overlay.yml
  const candidates = ['openapi.yml', 'openapi.json', 'discovery.json', 'overlay.yml'];
  let filePath = null;
  let isOverlay = false;
  for (const name of candidates) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) {
      filePath = p;
      isOverlay = name === 'overlay.yml';
      break;
    }
  }
  if (!filePath) throw new Error(`No spec file found in ${dir}`);

  return {
    filePath,
    pointer: fragment ? fragment.slice(1) : null,
    isOverlay,
    protocol,
    provider,
  };
}

// ── 加载文件 ──────────────────────────────────────────────────────────────────

function loadFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  // anthropic/official 的 openapi.yml 后缀是 .yml 但内容是 JSON
  if (filePath.endsWith('.json') || text.trimStart().startsWith('{')) {
    return JSON.parse(text);
  }
  return yaml.load(text);
}

// ── JSON Pointer 取值 ─────────────────────────────────────────────────────────

function getByPointer(obj, pointer) {
  if (!pointer || pointer === '/') return obj;
  const parts = pointer.split('/').filter(Boolean)
    .map(p => p.replace(/~1/g, '/').replace(/~0/g, '~'));
  let cur = obj;
  for (const k of parts) {
    if (cur == null) return undefined;
    cur = cur[k];
  }
  return cur;
}

// ── 公共 API: 加载 spec(可能是 base spec 或 overlay 已 resolve 后的结果)─────

/**
 * 加载并 resolve 一份 spec。若是 overlay,会自动找 base 并叠加。
 */
function loadSpec(uri) {
  const { filePath, pointer, isOverlay } = parseURI(uri);
  let spec;

  if (isOverlay) {
    const overlay = loadFile(filePath);
    if (!overlay.base) throw new Error(`Overlay ${filePath} missing 'base:'`);
    const base = loadSpec(overlay.base);
    spec = applyOverlay(base, overlay);
  } else {
    spec = loadFile(filePath);
  }

  return pointer ? getByPointer(spec, pointer) : spec;
}

// ── Overlay applier ──────────────────────────────────────────────────────────

/**
 * 把 overlay 叠加到 base spec 上,产出新 spec。
 * Overlay 语法见 upstream/anthropic/bedrock/overlay.yml。
 */
function applyOverlay(baseSpec, overlay) {
  const spec = JSON.parse(JSON.stringify(baseSpec));

  // info 覆写
  if (overlay.info) {
    spec.info = { ...spec.info, ...overlay.info };
  }

  // servers 覆写
  if (overlay.servers) {
    spec.servers = overlay.servers;
  }

  // security
  if (overlay.security) {
    if (overlay.security.drop) {
      for (const name of overlay.security.drop) {
        delete spec.components?.securitySchemes?.[name];
      }
    }
    if (overlay.security.add) {
      spec.components = spec.components || {};
      spec.components.securitySchemes = {
        ...(spec.components.securitySchemes || {}),
        ...overlay.security.add,
      };
    }
  }

  // pathsKeep + pathRewrites
  if (overlay.pathsKeep || overlay.pathRewrites) {
    const newPaths = {};
    const keep = new Set(overlay.pathsKeep || Object.keys(spec.paths || {}));
    const rewrites = overlay.pathRewrites || [];

    for (const oldPath of keep) {
      const oldOp = spec.paths?.[oldPath];
      if (!oldOp) continue;
      const matchingRewrites = rewrites.filter(r => r.from === oldPath);
      if (matchingRewrites.length === 0) {
        newPaths[oldPath] = oldOp;
      } else {
        for (const rw of matchingRewrites) {
          newPaths[rw.to] = applyPathRewrite(oldOp, rw);
        }
      }
    }
    spec.paths = newPaths;
  }

  // parametersDrop(全局移除 header/parameter)
  if (overlay.parametersDrop && spec.paths) {
    for (const pathObj of Object.values(spec.paths)) {
      for (const op of Object.values(pathObj)) {
        if (!op?.parameters) continue;
        op.parameters = op.parameters.filter(p => !overlay.parametersDrop.includes(p.name));
      }
    }
  }

  // requestBodyOverrides(对指定 schema 做 drop/add/modify)
  if (overlay.requestBodyOverrides && spec.components?.schemas) {
    for (const [schemaName, ovr] of Object.entries(overlay.requestBodyOverrides)) {
      const schema = spec.components.schemas[schemaName];
      if (!schema) continue;
      schema.properties = schema.properties || {};
      if (ovr.drop) {
        for (const f of ovr.drop) {
          delete schema.properties[f];
          if (schema.required) schema.required = schema.required.filter(r => r !== f);
        }
      }
      if (ovr.add) {
        for (const [f, def] of Object.entries(ovr.add)) {
          const { required, ...rest } = def;
          schema.properties[f] = rest;
          if (required === true) {
            schema.required = schema.required || [];
            if (!schema.required.includes(f)) schema.required.push(f);
          }
        }
      }
      if (ovr.modify) {
        for (const [f, def] of Object.entries(ovr.modify)) {
          schema.properties[f] = { ...(schema.properties[f] || {}), ...def };
        }
      }
    }
  }

  return spec;
}

function applyPathRewrite(oldOp, rewrite) {
  const newOp = JSON.parse(JSON.stringify(oldOp));
  if (rewrite.pathParameters) {
    for (const method of Object.keys(newOp)) {
      if (typeof newOp[method] !== 'object' || !newOp[method].parameters) {
        if (typeof newOp[method] === 'object') newOp[method].parameters = [];
      }
      if (typeof newOp[method] === 'object') {
        newOp[method].parameters = [...rewrite.pathParameters, ...(newOp[method].parameters || [])];
      }
    }
  }
  if (rewrite.responseContentType) {
    for (const method of Object.keys(newOp)) {
      const responses = newOp[method]?.responses;
      if (!responses) continue;
      for (const status of Object.keys(responses)) {
        const content = responses[status].content;
        if (!content) continue;
        const newContent = {};
        newContent[rewrite.responseContentType] = Object.values(content)[0];
        responses[status].content = newContent;
      }
    }
  }
  return newOp;
}

// ── CLI(直接跑此文件 → 验证 overlay)──────────────────────────────────────────

if (require.main === module) {
  const uri = process.argv[2];
  if (!uri) {
    console.error('Usage: node scripts/overlay/apply.js <avs:// URI>');
    console.error('Example: node scripts/overlay/apply.js avs://anthropic/bedrock');
    process.exit(1);
  }
  try {
    const spec = loadSpec(uri);
    console.log(JSON.stringify(spec, null, 2));
  } catch (e) {
    console.error('❌', e.message);
    process.exit(1);
  }
}

module.exports = {
  findAvsRoot,
  parseURI,
  loadFile,
  loadSpec,
  applyOverlay,
  getByPointer,
};
