#!/usr/bin/env node
/**
 * Google Discovery Format to OpenAPI 3.0 Converter
 *
 * Usage: node discovery-to-openapi.js <input.json> <output.yml>
 */

const fs = require('fs');
const yaml = require('js-yaml');

function convertDiscoveryToOpenAPI(discovery) {
    const openapi = {
        openapi: '3.0.0',
        info: {
            title: discovery.title || 'API',
            description: discovery.description || '',
            version: discovery.version || '1.0.0',
        },
        servers: [{
            url: discovery.rootUrl || discovery.baseUrl || 'https://example.com/',
        }],
        paths: {},
        components: {
            schemas: {},
            securitySchemes: {}
        }
    };

    // Convert authentication
    if (discovery.auth) {
        Object.entries(discovery.auth).forEach(([authType, authConfig]) => {
            if (authType === 'oauth2') {
                openapi.components.securitySchemes.oauth2 = {
                    type: 'oauth2',
                    flows: {
                        authorizationCode: {
                            authorizationUrl: authConfig.authorizationUrl || '',
                            tokenUrl: authConfig.tokenUrl || '',
                            scopes: authConfig.scopes || {}
                        }
                    }
                };
            }
        });
    }

    // Convert schemas
    if (discovery.schemas) {
        Object.entries(discovery.schemas).forEach(([name, schema]) => {
            openapi.components.schemas[name] = convertSchema(schema);
        });
    }

    // Convert resources to paths
    if (discovery.resources) {
        convertResources(discovery.resources, openapi.paths, discovery.basePath || '');
    }

    return openapi;
}

function convertSchema(schema) {
    const converted = {
        type: schema.type || 'object',
    };

    if (schema.description) converted.description = schema.description;
    if (schema.properties) {
        converted.properties = {};
        Object.entries(schema.properties).forEach(([name, prop]) => {
            converted.properties[name] = convertSchema(prop);
        });
    }
    if (schema.items) converted.items = convertSchema(schema.items);
    if (schema.enum) converted.enum = schema.enum;
    if (schema.$ref) converted.$ref = `#/components/schemas/${schema.$ref}`;
    if (schema.format) converted.format = schema.format;

    return converted;
}

function convertResources(resources, paths, basePath) {
    Object.entries(resources).forEach(([resourceName, resource]) => {
        if (resource.methods) {
            Object.entries(resource.methods).forEach(([methodName, method]) => {
                const path = basePath + (method.path || '');
                const httpMethod = (method.httpMethod || 'GET').toLowerCase();

                if (!paths[path]) paths[path] = {};

                paths[path][httpMethod] = {
                    operationId: method.id || `${resourceName}_${methodName}`,
                    summary: method.description || '',
                    parameters: convertParameters(method.parameters),
                    responses: {
                        '200': {
                            description: 'Successful response',
                            content: {
                                'application/json': {
                                    schema: method.response ? { $ref: `#/components/schemas/${method.response.$ref}` } : {}
                                }
                            }
                        }
                    }
                };

                if (method.request) {
                    paths[path][httpMethod].requestBody = {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: `#/components/schemas/${method.request.$ref}` }
                            }
                        }
                    };
                }
            });
        }

        if (resource.resources) {
            convertResources(resource.resources, paths, basePath);
        }
    });
}

function convertParameters(params) {
    if (!params) return [];

    return Object.entries(params).map(([name, param]) => ({
        name,
        in: param.location || 'query',
        required: param.required || false,
        description: param.description || '',
        schema: {
            type: param.type || 'string',
            enum: param.enum,
        }
    }));
}

// Main execution
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error('Usage: node discovery-to-openapi.js <input.json> <output.yml>');
        process.exit(1);
    }

    const [inputFile, outputFile] = args;

    try {
        const discovery = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
        const openapi = convertDiscoveryToOpenAPI(discovery);

        const yamlContent = yaml.dump(openapi, { lineWidth: -1 });
        fs.writeFileSync(outputFile, yamlContent);

        console.log(`✅ 转换成功: ${inputFile} → ${outputFile}`);
    } catch (error) {
        console.error('❌ 转换失败:', error.message);
        process.exit(1);
    }
}

module.exports = { convertDiscoveryToOpenAPI };
