"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireNonEmptyBody = void 0;
exports.validate = validate;
const express_validator_1 = require("express-validator");
const apiResponse_1 = require("../utils/apiResponse");
function validate(rules) {
    return async (req, res, next) => {
        for (const rule of rules) {
            await rule.run(req);
        }
        const result = (0, express_validator_1.validationResult)(req);
        if (!result.isEmpty()) {
            return (0, apiResponse_1.sendError)(res, 400, {
                code: "VALIDATION_ERROR",
                message: "Data yang dikirim tidak valid",
                details: result.array().map((e) => ({ field: "path" in e ? e.path : undefined, message: e.msg })),
            });
        }
        next();
    };
}
exports.requireNonEmptyBody = validate([
    (0, express_validator_1.body)().custom((value) => {
        if (typeof value !== "object" || value === null || Array.isArray(value) || Object.keys(value).length === 0) {
            throw new Error("Body request tidak boleh kosong");
        }
        return true;
    }),
]);
//# sourceMappingURL=validate.js.map