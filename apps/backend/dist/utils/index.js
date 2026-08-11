"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = exports.now = void 0;
exports.sanitizeUser = sanitizeUser;
exports.getNextQueueNumber = getNextQueueNumber;
const crypto_1 = require("crypto");
const now = () => new Date().toISOString();
exports.now = now;
const generateId = () => (0, crypto_1.randomUUID)();
exports.generateId = generateId;
function sanitizeUser(user) {
    const { password, ...safe } = user;
    return safe;
}
function getNextQueueNumber(date, appointments) {
    const filtered = appointments.filter((appt) => appt.date === date);
    if (filtered.length === 0)
        return 1;
    const highest = Math.max(...filtered.map((appt) => appt.queueNumber || 0));
    return highest + 1;
}
//# sourceMappingURL=index.js.map