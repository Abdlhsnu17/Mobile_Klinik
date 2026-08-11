"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_1 = require("../middlewares/auth");
const realtimeService_1 = require("../services/realtimeService");
const appConfig_1 = require("../config/appConfig");
const user = { id: "user-1", username: "perawat1", role: "perawat" };
describe("authenticateHandshake", () => {
    it("menerima token valid dari handshake.auth (bearer)", () => {
        const token = (0, auth_1.signAuthToken)(user);
        const payload = (0, realtimeService_1.authenticateHandshake)({ auth: { token }, headers: {} });
        expect(payload).toMatchObject({ id: user.id, username: user.username, role: user.role });
    });
    it("menerima token valid dari cookie auth", () => {
        const token = (0, auth_1.signAuthToken)(user);
        const payload = (0, realtimeService_1.authenticateHandshake)({
            headers: { cookie: `${appConfig_1.AUTH_COOKIE_NAME}=${encodeURIComponent(token)}` },
        });
        expect(payload).toMatchObject({ id: user.id, role: user.role });
    });
    it("mengutamakan bearer token dibanding cookie", () => {
        const token = (0, auth_1.signAuthToken)(user);
        const payload = (0, realtimeService_1.authenticateHandshake)({
            auth: { token },
            headers: { cookie: `${appConfig_1.AUTH_COOKIE_NAME}=token-cookie-tidak-valid` },
        });
        expect(payload.id).toBe(user.id);
    });
    it("menolak handshake tanpa token", () => {
        expect(() => (0, realtimeService_1.authenticateHandshake)({ headers: {} })).toThrow("Otentikasi realtime diperlukan.");
    });
    it("menolak token yang tidak valid", () => {
        expect(() => (0, realtimeService_1.authenticateHandshake)({ auth: { token: "token.jwt.palsu" }, headers: {} })).toThrow("Sesi realtime tidak valid atau kedaluwarsa.");
    });
    it("mengabaikan auth.token non-string", () => {
        expect(() => (0, realtimeService_1.authenticateHandshake)({ auth: { token: 12345 }, headers: {} })).toThrow("Otentikasi realtime diperlukan.");
    });
});
//# sourceMappingURL=realtimeService.test.js.map