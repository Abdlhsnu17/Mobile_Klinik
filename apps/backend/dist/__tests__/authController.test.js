"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const index_1 = require("../index");
const authService_1 = require("../services/authService");
jest.mock("../services/authService");
const mockedAuthService = authService_1.AuthService;
describe("Auth routes", () => {
    const app = (0, index_1.createApp)();
    describe("POST /api/auth/login", () => {
        it("menolak request tanpa username/password", async () => {
            const res = await (0, supertest_1.default)(app).post("/api/auth/login").send({});
            expect(res.status).toBe(400);
            expect(res.body.error.message).toBeDefined();
        });
        it("menolak kredensial yang tidak valid", async () => {
            mockedAuthService.findUserByLogin.mockResolvedValue(null);
            const res = await (0, supertest_1.default)(app)
                .post("/api/auth/login")
                .send({ username: "unknown", password: "secret123" });
            expect(res.status).toBe(401);
        });
        it("berhasil login dengan password bcrypt", async () => {
            const hashedPassword = await bcryptjs_1.default.hash("secret123", 10);
            mockedAuthService.findUserByLogin.mockResolvedValue({
                id: "user-1",
                username: "admin",
                name: "Admin",
                email: "admin@example.com",
                role: "admin",
                password: hashedPassword,
                createdAt: new Date().toISOString(),
            });
            const res = await (0, supertest_1.default)(app)
                .post("/api/auth/login")
                .send({ username: "admin", password: "secret123" });
            expect(res.status).toBe(200);
            expect(res.body.data.user.username).toBe("admin");
            expect(res.body.data.user.password).toBeUndefined();
            expect(mockedAuthService.updateUserPassword).not.toHaveBeenCalled();
        });
        it("menerima email sebagai identitas login", async () => {
            const hashedPassword = await bcryptjs_1.default.hash("secret123", 10);
            mockedAuthService.findUserByLogin.mockResolvedValue({
                id: "user-email",
                username: "admin",
                name: "Admin",
                email: "admin@example.com",
                role: "admin",
                password: hashedPassword,
                createdAt: new Date().toISOString(),
            });
            const res = await (0, supertest_1.default)(app)
                .post("/api/auth/login")
                .send({ username: " admin@example.com ", password: "secret123" });
            expect(res.status).toBe(200);
            expect(mockedAuthService.findUserByLogin).toHaveBeenCalledWith("admin@example.com");
            expect(res.body.data.user.email).toBe("admin@example.com");
        });
        it("migrasi password plaintext lama setelah login berhasil", async () => {
            mockedAuthService.findUserByLogin.mockResolvedValue({
                id: "user-legacy",
                username: "admin",
                name: "Admin",
                email: "admin@example.com",
                role: "admin",
                password: "admin123",
                createdAt: new Date().toISOString(),
            });
            mockedAuthService.updateUserPassword.mockResolvedValue(undefined);
            const res = await (0, supertest_1.default)(app)
                .post("/api/auth/login")
                .send({ username: "admin", password: "admin123" });
            expect(res.status).toBe(200);
            expect(mockedAuthService.updateUserPassword).toHaveBeenCalledWith("user-legacy", expect.stringMatching(/^\$2/));
        });
        it("menolak login bila bcrypt hash tersimpan tidak cocok dengan password", async () => {
            // Hash bcrypt yang valid tetapi BUKAN untuk "admin123". Sistem tidak boleh
            // "memperbaiki" hash yang tidak cocok — itu akan membuka celah login dengan
            // password default terhadap akun yang hash-nya sudah berubah.
            mockedAuthService.findUserByLogin.mockResolvedValue({
                id: "usr-admin-001",
                username: "admin",
                name: "Admin Utama",
                email: "admin@klinik.com",
                role: "admin",
                password: "$2a$10$8.O3..p5.jP9P/Vn2AfA5.gY.xIS2iWJSLASGk5O02Yk5dI/fXGgG",
                createdAt: new Date().toISOString(),
            });
            mockedAuthService.updateUserPassword.mockResolvedValue(undefined);
            const res = await (0, supertest_1.default)(app)
                .post("/api/auth/login")
                .send({ username: "admin", password: "admin123" });
            expect(res.status).toBe(401);
            expect(mockedAuthService.updateUserPassword).not.toHaveBeenCalled();
        });
    });
    describe("POST /api/auth/register", () => {
        it("menolak password yang terlalu pendek", async () => {
            const res = await (0, supertest_1.default)(app).post("/api/auth/register").send({
                username: "budi",
                password: "123",
                name: "Budi",
                email: "budi@example.com",
                role: "umum",
            });
            expect(res.status).toBe(400);
        });
        it("menolak email yang tidak valid", async () => {
            const res = await (0, supertest_1.default)(app).post("/api/auth/register").send({
                username: "budi",
                password: "rahasia123",
                name: "Budi",
                email: "bukan-email",
                role: "umum",
            });
            expect(res.status).toBe(400);
        });
        it("berhasil registrasi dengan data valid", async () => {
            mockedAuthService.userExists.mockResolvedValue(false);
            mockedAuthService.createUser.mockResolvedValue(undefined);
            const res = await (0, supertest_1.default)(app).post("/api/auth/register").send({
                username: "budi",
                password: "rahasia123",
                name: "Budi",
                email: "budi@example.com",
                role: "umum",
            });
            expect(res.status).toBe(201);
            expect(res.body.data.user.username).toBe("budi");
            expect(res.body.data.user.role).toBe("umum");
            expect(res.body.data.user.password).toBeUndefined();
            expect(res.body.data.token).toBeUndefined();
            expect(res.headers["set-cookie"]?.[0]).toContain("clinic_auth_token=");
            expect(mockedAuthService.createUser).toHaveBeenCalledWith(expect.objectContaining({ username: "budi", role: "umum" }));
        });
    });
    describe("GET /api/auth/me", () => {
        /** Login sekali untuk mendapatkan cookie sesi yang valid. */
        async function loginAndGetCookie() {
            const hashedPassword = await bcryptjs_1.default.hash("secret123", 10);
            mockedAuthService.findUserByLogin.mockResolvedValue({
                id: "user-1",
                username: "admin",
                name: "Admin",
                email: "admin@example.com",
                role: "admin",
                password: hashedPassword,
                createdAt: new Date().toISOString(),
            });
            const res = await (0, supertest_1.default)(app)
                .post("/api/auth/login")
                .send({ username: "admin", password: "secret123" });
            return res.headers["set-cookie"];
        }
        it("menolak permintaan tanpa sesi", async () => {
            const res = await (0, supertest_1.default)(app).get("/api/auth/me");
            expect(res.status).toBe(401);
        });
        it("mengembalikan profil pengguna dari cookie sesi", async () => {
            const cookie = await loginAndGetCookie();
            mockedAuthService.findUserById.mockResolvedValue({
                id: "user-1",
                username: "admin",
                name: "Admin",
                email: "admin@example.com",
                role: "admin",
                password: "hashed",
                createdAt: new Date().toISOString(),
            });
            const res = await (0, supertest_1.default)(app).get("/api/auth/me").set("Cookie", cookie);
            expect(res.status).toBe(200);
            expect(res.body.data.user.username).toBe("admin");
            // Password tidak boleh ikut terkirim ke klien.
            expect(res.body.data.user.password).toBeUndefined();
        });
        it("membalas 404 bila pengguna sesi sudah dihapus", async () => {
            const cookie = await loginAndGetCookie();
            mockedAuthService.findUserById.mockResolvedValue(null);
            const res = await (0, supertest_1.default)(app).get("/api/auth/me").set("Cookie", cookie);
            expect(res.status).toBe(404);
        });
    });
});
//# sourceMappingURL=authController.test.js.map