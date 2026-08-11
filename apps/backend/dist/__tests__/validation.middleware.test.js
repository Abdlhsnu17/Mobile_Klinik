"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const express_validator_1 = require("express-validator");
const validate_1 = require("../middlewares/validate");
function buildTestApp(middleware) {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.post("/test", middleware, (req, res) => res.json({ ok: true }));
    return app;
}
describe("validate middleware", () => {
    it("mengembalikan 400 jika rule gagal", async () => {
        const app = buildTestApp((0, validate_1.validate)([(0, express_validator_1.body)("name").isString().notEmpty()]));
        const res = await (0, supertest_1.default)(app).post("/test").send({});
        expect(res.status).toBe(400);
        expect(res.body.error.details).toBeDefined();
    });
    it("lanjut ke handler jika rule lolos", async () => {
        const app = buildTestApp((0, validate_1.validate)([(0, express_validator_1.body)("name").isString().notEmpty()]));
        const res = await (0, supertest_1.default)(app).post("/test").send({ name: "Budi" });
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
    });
});
describe("requireNonEmptyBody middleware", () => {
    it("menolak body kosong", async () => {
        const app = buildTestApp(validate_1.requireNonEmptyBody);
        const res = await (0, supertest_1.default)(app).post("/test").send({});
        expect(res.status).toBe(400);
    });
    it("menerima body yang berisi data", async () => {
        const app = buildTestApp(validate_1.requireNonEmptyBody);
        const res = await (0, supertest_1.default)(app).post("/test").send({ foo: "bar" });
        expect(res.status).toBe(200);
    });
});
//# sourceMappingURL=validation.middleware.test.js.map