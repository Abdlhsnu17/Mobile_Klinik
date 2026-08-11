"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promise_1 = __importDefault(require("mysql2/promise"));
const config_1 = require("@sistem-klinik/config");
const { database } = config_1.appConfig;
const config = {
    host: process.env.MYSQL_HOST ?? database.host,
    port: Number(process.env.MYSQL_PORT ?? database.port),
    user: process.env.MYSQL_USER ?? database.user,
    password: process.env.MYSQL_PASSWORD ?? database.password,
    database: process.env.MYSQL_DATABASE ?? database.name,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 5000,
    // Nilai kolom DATE adalah tanggal kalender klinik, bukan timestamp UTC.
    // Mengembalikannya sebagai string mencegah tanggal bergeser satu hari.
    dateStrings: ["DATE"],
};
if (database.socket)
    config.socketPath = database.socket;
const pool = promise_1.default.createPool(config);
exports.default = pool;
//# sourceMappingURL=client.js.map