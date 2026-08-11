"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const userController = __importStar(require("../controllers/userController"));
const userService = __importStar(require("../services/userService"));
jest.mock("../services/userService");
const mockedUserService = userService;
function createMockResponse() {
    const res = {
        req: {},
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    };
    return res;
}
describe("userController.updateAvatar", () => {
    it("meneruskan error 401 ketika user tidak terautentikasi", async () => {
        const req = { user: undefined, file: undefined };
        const res = createMockResponse();
        const next = jest.fn();
        await userController.updateAvatar(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
        expect(mockedUserService.updateAvatar).not.toHaveBeenCalled();
    });
    it("meneruskan error 400 ketika file tidak ada", async () => {
        const req = { user: { id: "user-1" }, file: undefined };
        const res = createMockResponse();
        const next = jest.fn();
        await userController.updateAvatar(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
        expect(mockedUserService.updateAvatar).not.toHaveBeenCalled();
    });
    it("berhasil memperbarui avatar dan mengembalikan user tanpa password", async () => {
        const req = {
            user: { id: "user-1" },
            file: { path: "/uploads/avatars/user-1-123.jpg" },
        };
        const res = createMockResponse();
        const next = jest.fn();
        mockedUserService.updateAvatar.mockResolvedValue({
            id: "user-1",
            username: "budi",
            name: "Budi",
            email: "budi@example.com",
            role: "umum",
            password: "hashed-password",
            createdAt: new Date().toISOString(),
            avatarUrl: "/uploads/avatars/user-1-123.jpg",
        });
        await userController.updateAvatar(req, res, next);
        expect(mockedUserService.updateAvatar).toHaveBeenCalledWith("user-1", "/uploads/avatars/user-1-123.jpg");
        expect(next).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                user: expect.objectContaining({ username: "budi" }),
            }),
        }));
        const jsonCall = res.json.mock.calls[0][0];
        expect(jsonCall.data.user.password).toBeUndefined();
    });
});
//# sourceMappingURL=userController.test.js.map