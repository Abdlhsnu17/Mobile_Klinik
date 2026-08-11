"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.appConfig = void 0;
require("dotenv/config");
const joi_1 = __importDefault(require("joi"));
const schema = joi_1.default.object({
    NODE_ENV: joi_1.default.string().valid("development", "test", "production").default("development"),
    PORT: joi_1.default.number().port().default(4004),
    FRONTEND_URL: joi_1.default.string().uri({ allowRelative: false }).default("http://localhost:3001"),
    BACKEND_PUBLIC_URL: joi_1.default.string().uri({ allowRelative: false }).default("http://localhost:4004"),
    DB_HOST: joi_1.default.string().default("127.0.0.1"),
    DB_PORT: joi_1.default.number().port().default(3306),
    DB_NAME: joi_1.default.string().default("sistem_klinik"),
    DB_USER: joi_1.default.string().default("root"),
    DB_PASSWORD: joi_1.default.string().allow("").default(""),
    DB_SOCKET: joi_1.default.string().allow("").default(""),
    REDIS_URL: joi_1.default.string().uri({ scheme: ["redis", "rediss"] }).default("redis://localhost:6379"),
    JWT_SECRET: joi_1.default.string().min(24).default("change_this_to_a_long_random_secret"),
    JWT_EXPIRES_IN: joi_1.default.string().default("8h"),
    AUTH_COOKIE_NAME: joi_1.default.string().default("clinic_auth_token"),
    AUTH_COOKIE_MAX_AGE_MS: joi_1.default.number().integer().positive().default(28800000),
}).unknown(true);
const { value, error } = schema.validate(process.env, { abortEarly: false, convert: true });
if (error) {
    throw new Error(`Invalid environment configuration: ${error.message}`);
}
exports.appConfig = {
    nodeEnv: value.NODE_ENV,
    port: Number(value.PORT),
    frontendUrl: value.FRONTEND_URL,
    backendPublicUrl: value.BACKEND_PUBLIC_URL,
    redisUrl: value.REDIS_URL,
    jwtSecret: value.JWT_SECRET,
    jwtExpiresIn: value.JWT_EXPIRES_IN,
    authCookieName: value.AUTH_COOKIE_NAME,
    authCookieMaxAgeMs: Number(value.AUTH_COOKIE_MAX_AGE_MS),
    database: {
        host: value.DB_HOST,
        port: Number(value.DB_PORT),
        name: value.DB_NAME,
        user: value.DB_USER,
        password: value.DB_PASSWORD,
        socket: value.DB_SOCKET,
    },
};
//# sourceMappingURL=index.js.map