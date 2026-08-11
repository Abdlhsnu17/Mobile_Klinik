"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const utils_1 = require("../utils");
const collectionService_1 = require("./collectionService");
class AuditService {
    static async record(params) {
        if (params.collection === "auditLogs")
            return null;
        return collectionService_1.CollectionService.createItem("auditLogs", {
            collection: params.collection,
            itemId: params.itemId,
            action: params.action,
            userId: params.user?.id,
            username: params.user?.username,
            role: params.user?.role,
            before: params.before,
            after: params.after,
            reason: params.reason,
            createdAt: (0, utils_1.now)(),
        });
    }
}
exports.AuditService = AuditService;
//# sourceMappingURL=auditService.js.map