"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = exports.now = void 0;
const crypto_1 = require("crypto");
const now = () => new Date().toISOString();
exports.now = now;
const generateId = () => (0, crypto_1.randomUUID)();
exports.generateId = generateId;
//# sourceMappingURL=index.js.map