"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollectionRepository = void 0;
const store_1 = require("../models/store");
class CollectionRepository {
    static async findAll(collection) {
        return (0, store_1.readCollection)(collection);
    }
    static async findById(collection, id) {
        const data = await this.findAll(collection);
        return data.find((record) => record.id === id) ?? null;
    }
    static async insert(collection, item) {
        await (0, store_1.insertOne)(collection, item);
        return item;
    }
    static async update(collection, id, item) {
        await (0, store_1.updateOne)(collection, id, item);
        return item;
    }
    static async delete(collection, id) {
        return (0, store_1.deleteOne)(collection, id);
    }
}
exports.CollectionRepository = CollectionRepository;
//# sourceMappingURL=collectionRepository.js.map