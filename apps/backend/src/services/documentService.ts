import fs from "fs"
import path from "path"
import { CollectionService } from "./collectionService"
import type { DocumentUpload } from "../types"
import { now } from "../utils"

const UPLOADS_DIR = path.resolve(__dirname, "..", "..", "uploads")
fs.mkdirSync(UPLOADS_DIR, { recursive: true })

export class DocumentService {
  static collection = "documents" as const

  static async list(): Promise<DocumentUpload[]> {
    return CollectionService.list(this.collection)
  }

  static async findById(id: string): Promise<DocumentUpload | null> {
    return CollectionService.findById(this.collection, id)
  }

  static async create(payload: Partial<DocumentUpload>): Promise<DocumentUpload> {
    const normalized: Partial<DocumentUpload> = {
      ...payload,
      uploadedAt: payload.uploadedAt ?? now(),
      updatedAt: now(),
    }
    return CollectionService.createItem(this.collection, normalized as Partial<DocumentUpload>)
  }

  static async delete(id: string): Promise<boolean> {
    const document = await this.findById(id)
    if (!document) return false

    const filePath = this.getFilePath(document.filename)
    try {
      await fs.promises.unlink(filePath)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error
      }
    }

    return CollectionService.deleteItem(this.collection, id)
  }

  static getFilePath(filename: string): string {
    return path.join(UPLOADS_DIR, filename)
  }
}
