"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatientService = void 0;
const collectionService_1 = require("./collectionService");
class PatientService {
    static async list() {
        return collectionService_1.CollectionService.list("patients");
    }
    static async findById(id) {
        return collectionService_1.CollectionService.findById("patients", id);
    }
    static async create(payload) {
        return collectionService_1.CollectionService.createItem("patients", payload);
    }
    static async update(id, payload) {
        return collectionService_1.CollectionService.updateItem("patients", id, payload);
    }
    static async remove(id) {
        return collectionService_1.CollectionService.deleteItem("patients", id);
    }
}
exports.PatientService = PatientService;
//# sourceMappingURL=patientService.js.map