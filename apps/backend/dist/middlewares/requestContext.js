"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachRequestContext = attachRequestContext;
const crypto_1 = require("crypto");
const REQUEST_ID_HEADER = "x-request-id";
function normalizeRequestId(value) {
    if (typeof value !== "string")
        return null;
    const trimmed = value.trim();
    if (!trimmed)
        return null;
    if (trimmed.length > 128)
        return null;
    return trimmed;
}
function attachRequestContext(req, res, next) {
    const headerValue = normalizeRequestId(req.headers[REQUEST_ID_HEADER]);
    const requestId = headerValue ?? (0, crypto_1.randomUUID)();
    req.requestId = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);
    next();
}
//# sourceMappingURL=requestContext.js.map