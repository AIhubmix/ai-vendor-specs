#!/usr/bin/env node
/**
 * Documentation Crawler and OpenAPI Generator
 *
 * 从 API 文档网页爬取信息并生成 OpenAPI 规范
 *
 * Usage: node docs-to-openapi.js <config.json>
 *
 * Config format:
 * {
 *   "provider": "anthropic",
 *   "baseUrl": "https://api.anthropic.com",
 *   "docsUrl": "https://docs.anthropic.com/en/api",
 *   "endpoints": [
 *     {
 *       "path": "/v1/messages",
 *       "method": "POST",
 *       "docsSection": "#messages"
 *     }
 *   ]
 * }
 */

const https = require('https');
const fs = require('fs');
const yaml = require('js-yaml');

// 简化的爬虫 - 实际使用时建议使用 puppeteer 或 cheerio
async function fetchDocs(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

// 从文档 HTML 中提取 API 信息（需要根据具体文档结构调整）
function extractAPIInfo(html, endpoint) {
    // 这里需要根据不同厂商的文档结构来解析
    // 示例：提取请求参数、响应结构等

    return {
        description: `API endpoint for ${endpoint.path}`,
        parameters: [],
        requestBody: {},
        responses: {
            '200': {
                description: 'Successful response'
            }
        }
    };
}

async function generateOpenAPI(config) {
    // 构建 API 标题
    const protocol = config.protocol || 'unknown';
    const provider = config.provider || 'unknown';
    const displayName = config.displayName || `${protocol}/${provider}`;

    const openapi = {
        openapi: '3.0.0',
        info: {
            title: `${displayName} API`,
            version: '1.0.0',
            description: `Generated from ${config.docsUrl || 'configuration'}`
        },
        servers: [{
            url: config.baseUrl
        }],
        paths: {}
    };

    // 如果提供了端点配置，使用配置生成
    if (config.endpoints) {
        config.endpoints.forEach(endpoint => {
            const path = endpoint.path;
            const method = endpoint.method.toLowerCase();

            if (!openapi.paths[path]) {
                openapi.paths[path] = {};
            }

            openapi.paths[path][method] = {
                summary: endpoint.summary || '',
                description: endpoint.description || '',
                operationId: endpoint.operationId || `${method}_${path.replace(/\//g, '_')}`,
                requestBody: endpoint.requestBody,
                responses: endpoint.responses || {
                    '200': { description: 'Successful response' }
                }
            };

            if (endpoint.parameters) {
                openapi.paths[path][method].parameters = endpoint.parameters;
            }
        });
    }

    return openapi;
}

// Main execution
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.error('Usage: node docs-to-openapi.js <config.json>');
        console.error('\nExample config:');
        console.error(JSON.stringify({
            provider: 'example',
            baseUrl: 'https://api.example.com',
            docsUrl: 'https://docs.example.com',
            endpoints: [{
                path: '/v1/chat',
                method: 'POST',
                summary: 'Create chat completion'
            }]
        }, null, 2));
        process.exit(1);
    }

    const configFile = args[0];

    (async () => {
        try {
            const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
            const openapi = await generateOpenAPI(config);

            const outputFile = configFile.replace('.json', '.openapi.yml');
            const yamlContent = yaml.dump(openapi, { lineWidth: -1 });
            fs.writeFileSync(outputFile, yamlContent);

            console.log(`✅ 生成成功: ${outputFile}`);
            console.log(`📝 提示: 这是基于配置的基础规范，可能需要手动完善`);
        } catch (error) {
            console.error('❌ 生成失败:', error.message);
            process.exit(1);
        }
    })();
}

module.exports = { generateOpenAPI };
