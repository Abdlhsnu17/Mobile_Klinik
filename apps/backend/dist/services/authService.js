"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const mysqlClient_1 = __importDefault(require("../config/mysqlClient"));
const utils_1 = require("../utils");
const httpError_1 = require("../utils/httpError");
function toMysqlDatetime(value) {
    return value
        ? new Date(value).toISOString().slice(0, 19).replace("T", " ")
        : new Date().toISOString().slice(0, 19).replace("T", " ");
}
class AuthService {
    static async listUsers() {
        const [rows] = await mysqlClient_1.default.query("SELECT * FROM users ORDER BY createdAt DESC");
        return rows;
    }
    static async findUserById(id) {
        const [rows] = await mysqlClient_1.default.query("SELECT * FROM users WHERE id = ? LIMIT 1", [id]);
        return rows[0] || null;
    }
    static async findUserByUsername(username) {
        const [rows] = await mysqlClient_1.default.query("SELECT * FROM users WHERE username = ? LIMIT 1", [username]);
        return rows[0] || null;
    }
    static async findUserByLogin(identifier) {
        const normalizedIdentifier = identifier.trim();
        const [rows] = await mysqlClient_1.default.query("SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1", [
            normalizedIdentifier,
            normalizedIdentifier,
        ]);
        return rows[0] || null;
    }
    static async findUserByEmail(email) {
        const [rows] = await mysqlClient_1.default.query("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
        return rows[0] || null;
    }
    static async userExists(username, email) {
        const [rows] = await mysqlClient_1.default.query("SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1", [username, email]);
        return rows.length > 0;
    }
    static async createUser(user) {
        await mysqlClient_1.default.query("INSERT INTO users (id, username, name, email, role, password, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)", [user.id, user.username, user.name, user.email, user.role, user.password, toMysqlDatetime(user.createdAt)]);
    }
    static async createUserWithPassword(payload, hashedPassword) {
        const exists = await this.userExists(payload.username, payload.email);
        if (exists) {
            throw (0, httpError_1.createHttpError)(409, "Username atau email sudah terdaftar");
        }
        const user = {
            id: (0, utils_1.generateId)(),
            username: payload.username,
            name: payload.name,
            email: payload.email,
            role: payload.role,
            password: hashedPassword,
            createdAt: (0, utils_1.now)(),
        };
        await this.createUser(user);
        return user;
    }
    static async updateUser(userId, payload) {
        const user = await this.findUserById(userId);
        if (!user)
            return null;
        const validPayload = Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
        const fieldsToUpdate = Object.keys(validPayload);
        if (fieldsToUpdate.length === 0) {
            return user;
        }
        const setClauses = fieldsToUpdate.map((field) => `\`${field}\` = ?`).join(", ");
        const values = fieldsToUpdate.map((field) => validPayload[field]);
        await mysqlClient_1.default.query(`UPDATE users SET ${setClauses} WHERE id = ?`, [...values, userId]);
        return { ...user, ...validPayload };
    }
    static async deleteUser(userId) {
        const existing = await this.findUserById(userId);
        if (!existing)
            return false;
        await mysqlClient_1.default.query("DELETE FROM users WHERE id = ?", [userId]);
        return true;
    }
    static async updateUserPassword(userId, password) {
        await mysqlClient_1.default.query("UPDATE users SET password = ? WHERE id = ?", [password, userId]);
    }
    static async createPasswordResetRequest(user) {
        const payload = {
            id: (0, utils_1.generateId)(),
            userId: user.id,
            email: user.email,
            token: (0, utils_1.generateId)().slice(0, 12),
            expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            used: false,
            createdAt: (0, utils_1.now)(),
        };
        await mysqlClient_1.default.query("INSERT INTO password_reset_requests (id, userId, email, token, expiresAt, used, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)", [payload.id, payload.userId, payload.email, payload.token, toMysqlDatetime(payload.expiresAt), payload.used, toMysqlDatetime(payload.createdAt)]);
        return payload;
    }
    static async getValidPasswordResetRequest(token) {
        const [rows] = await mysqlClient_1.default.query("SELECT * FROM password_reset_requests WHERE token = ? AND used = 0 AND expiresAt > NOW() LIMIT 1", [token]);
        return rows[0] || null;
    }
    static async markPasswordResetRequestUsed(requestId) {
        await mysqlClient_1.default.query("UPDATE password_reset_requests SET used = 1 WHERE id = ?", [requestId]);
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=authService.js.map