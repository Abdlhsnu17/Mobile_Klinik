"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHttpError = createHttpError;
function createHttpError(statusCode, message, details) {
    const error = new Error(message);
    error.statusCode = statusCode;
    if (details !== undefined) {
        error.details = details;
    }
    return error;
}
//# sourceMappingURL=httpError.js.map