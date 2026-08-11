"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollectionService = void 0;
const collectionRepository_1 = require("../repositories/collectionRepository");
const utils_1 = require("../utils");
const realtimeService_1 = require("./realtimeService");
class CollectionService {
    static async list(collection) {
        return await collectionRepository_1.CollectionRepository.findAll(collection);
    }
    static async findById(collection, id) {
        return collectionRepository_1.CollectionRepository.findById(collection, id);
    }
    static async createItem(collection, payload) {
        const data = await collectionRepository_1.CollectionRepository.findAll(collection);
        const item = this.buildItem(collection, payload, data);
        const created = await collectionRepository_1.CollectionRepository.insert(collection, item);
        if (collection === "appointments") {
            (0, realtimeService_1.publishQueueChange)({ action: "created", appointmentId: generatedItemId(created), occurredAt: (0, utils_1.now)() });
        }
        return created;
    }
    static async updateItem(collection, id, payload) {
        const existing = await collectionRepository_1.CollectionRepository.findById(collection, id);
        if (!existing)
            return null;
        const updated = { ...existing, ...payload, updatedAt: (0, utils_1.now)() };
        const result = await collectionRepository_1.CollectionRepository.update(collection, id, updated);
        if (collection === "appointments" && result) {
            (0, realtimeService_1.publishQueueChange)({ action: "updated", appointmentId: id, occurredAt: (0, utils_1.now)() });
        }
        return result;
    }
    static async deleteItem(collection, id) {
        const deleted = await collectionRepository_1.CollectionRepository.delete(collection, id);
        if (collection === "appointments" && deleted) {
            (0, realtimeService_1.publishQueueChange)({ action: "deleted", appointmentId: id, occurredAt: (0, utils_1.now)() });
        }
        return deleted;
    }
    static buildItem(collection, payload, existing) {
        const identifiable = payload;
        const generatedId = identifiable.id || (0, utils_1.generateId)();
        const createdAt = identifiable.createdAt || (0, utils_1.now)();
        const normalized = { ...payload, id: generatedId, createdAt };
        if (collection === "appointments") {
            const appointment = normalized;
            const date = appointment.date || new Date().toISOString().split("T")[0];
            const queueNumber = appointment.queueNumber ?? (0, utils_1.getNextQueueNumber)(date, existing);
            Object.assign(appointment, { date, queueNumber });
            return appointment;
        }
        if (["patients", "medicines", "medicalRecords", "radiologyOrders", "clinicalDocuments"].includes(collection)) {
            ;
            normalized.updatedAt = (0, utils_1.now)();
        }
        if (collection === "radiologyOrders") {
            const order = normalized;
            Object.assign(order, {
                priority: order.priority ?? "routine",
                status: order.status ?? "requested",
                requestedAt: order.requestedAt ?? (0, utils_1.now)(),
            });
        }
        if (collection === "clinicalDocuments") {
            const document = normalized;
            Object.assign(document, {
                status: document.status ?? "draft",
            });
        }
        return normalized;
    }
}
exports.CollectionService = CollectionService;
function generatedItemId(item) {
    return item.id;
}
//# sourceMappingURL=collectionService.js.map