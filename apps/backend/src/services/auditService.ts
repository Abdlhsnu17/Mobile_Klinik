import type { AuthTokenPayload } from "../middlewares/auth"
import type { AuditLog } from "../types"
import { now } from "../utils"
import { CollectionService } from "./collectionService"

export class AuditService {
  static async record(params: {
    collection: string
    itemId: string
    action: AuditLog["action"]
    user?: AuthTokenPayload
    before?: unknown
    after?: unknown
    reason?: string
  }) {
    if (params.collection === "auditLogs") return null

    return CollectionService.createItem("auditLogs", {
      collection: params.collection,
      itemId: params.itemId,
      action: params.action,
      userId: params.user?.id,
      username: params.user?.username,
      role: params.user?.role,
      before: params.before,
      after: params.after,
      reason: params.reason,
      createdAt: now(),
    })
  }
}
