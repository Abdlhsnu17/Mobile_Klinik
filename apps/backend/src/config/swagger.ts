import path from "path";
import swaggerJsdoc from "swagger-jsdoc";
import { collectionPaths } from "../routes/collections";
import { buildBackendUrl } from "./appConfig";

function buildCollectionPaths() {
  const paths: Record<string, any> = {}

  for (const [collection, route] of Object.entries(collectionPaths)) {
    const basePath = `/${route}`
    const itemPath = `/${route}/{id}`
    const tag = collection

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
    }

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
    }
  }

  return paths
}

export function createSwaggerSpec(port: number) {
  return swaggerJsdoc({
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Sistem Manajemen Klinik API",
        version: "1.0.0",
        description: "Dokumentasi API backend sistem manajemen klinik",
      },
      servers: [{ url: `${buildBackendUrl(port)}/api` }],
      paths: buildCollectionPaths(),
    },
    apis: [path.join(__dirname, "..", "routes", "*.ts"), path.join(__dirname, "..", "routes", "*.js")],
  })
}
