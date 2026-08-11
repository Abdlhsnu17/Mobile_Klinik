"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSuccess = sendSuccess;
exports.sendError = sendError;
function sendSuccess(res, data, statusCode = 200, meta) {
    const requestId = res.req.requestId;
    return res.status(statusCode).json({
        data,
        ...(meta ? { meta } : {}),
        ...(requestId ? { requestId } : {}),
    });
}
function sendError(res, statusCode, payload) {
    const requestId = res.req.requestId;
    return res.status(statusCode).json({
        error: payload,
        ...(requestId ? { requestId } : {}),
    });
}
//# sourceMappingURL=apiResponse.js.map