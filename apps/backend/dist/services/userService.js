"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAvatar = updateAvatar;
const authService_1 = require("./authService");
const httpError_1 = require("../utils/httpError");
async function updateAvatar(userId, avatarFilePath) {
    const urlPath = avatarFilePath.replace(/\\/g, '/').split('/uploads/').pop();
    const avatarUrl = `/uploads/${urlPath}`;
    const updatedUser = await authService_1.AuthService.updateUser(userId, { avatarUrl });
    if (!updatedUser) {
        throw (0, httpError_1.createHttpError)(500, "Gagal memperbarui data pengguna setelah unggah avatar.");
    }
    return updatedUser;
}
//# sourceMappingURL=userService.js.map