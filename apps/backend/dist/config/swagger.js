"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSwaggerSpec = createSwaggerSpec;
const path_1 = __importDefault(require("path"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const collections_1 = require("../routes/collections");
const appConfig_1 = require("./appConfig");
function buildCollectionPaths() {
    const paths = {};
    for (const [collection, route] of Object.entries(collections_1.collectionPaths)) {
        const basePath = `/${route}`;
        const itemPath = `/${route}/{id}`;
        const tag = collection;
        paths[basePath] = {
            get: {
                tags: [tag],
                summary: `List ${collection}`,
                responses: { 200: { description: "OK" } },
            },
            post: {
                tags: [tag],
                summary: `Buat ${collection} baru`,
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { type: "object" } } },
                },
                responses: {
                    201: { description: "Created" },
                    400: { description: "Data tidak valid" },
                },
            },
        };
        paths[itemPath] = {
            get: {
                tags: [tag],
                summary: `Ambil ${collection} berdasarkan id`,
                parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
                responses: { 200: { description: "OK" }, 404: { description: "Tidak ditemukan" } },
            },
            put: {
                tags: [tag],
                summary: `Update ${collection}`,
                parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { type: "object" } } },
                },
                responses: {
                    200: { description: "Updated" },
                    400: { description: "Data tidak valid" },
                    404: { description: "Tidak ditemukan" },
                },
            },
            delete: {
                tags: [tag],
                summary: `Hapus ${collection}`,
                parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
                responses: { 204: { description: "Deleted" }, 404: { description: "Tidak ditemukan" } },
            },
        };
    }
    return paths;
}
function createSwaggerSpec(port) {
    return (0, swagger_jsdoc_1.default)({
        definition: {
            openapi: "3.0.0",
            info: {
                title: "Sistem Manajemen Klinik API",
                version: "1.0.0",
                description: "Dokumentasi API backend sistem manajemen klinik",
            },
            servers: [{ url: `${(0, appConfig_1.buildBackendUrl)(port)}/api` }],
            paths: buildCollectionPaths(),
        },
        apis: [path_1.default.join(__dirname, "..", "routes", "*.ts"), path_1.default.join(__dirname, "..", "routes", "*.js")],
    });
}
//# sourceMappingURL=swagger.js.map