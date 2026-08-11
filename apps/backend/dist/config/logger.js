"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.error = exports.info = exports.warn = exports.success = void 0;
function normalizeError(err) {
    if (err instanceof Error) {
        return {
            name: err.name,
            message: err.message,
            stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
        };
    }
    return err;
}
function writeLog(level, message, context) {
    const entry = {
        level,
        message,
        timestamp: new Date().toISOString(),
        ...(context ? { context } : {}),
    };
    const output = JSON.stringify(entry);
    if (level === "warn") {
        console.warn(output);
        return;
    }
    if (level === "error") {
        console.error(output);
        return;
    }
    console.log(output);
}
const success = (message, context) => writeLog("success", message, context);
exports.success = success;
const warn = (message, context) => writeLog("warn", message, context);
exports.warn = warn;
const info = (message, context) => writeLog("info", message, context);
exports.info = info;
const error = (message, err, context) => writeLog("error", message, {
    ...(context ?? {}),
    ...(err ? { error: normalizeError(err) } : {}),
});
exports.error = error;
//# sourceMappingURL=logger.js.map