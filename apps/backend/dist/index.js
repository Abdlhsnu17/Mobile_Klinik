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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const cors_1 = __importDefault(require("cors"));
require("dotenv/config");
const express_1 = __importStar(require("express"));
const http_1 = require("http");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const helmet_1 = __importDefault(require("helmet"));
const path_1 = __importDefault(require("path"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const config_1 = require("@sistem-klinik/config");
const appConfig_1 = require("./config/appConfig");
const logger_1 = require("./config/logger");
const swagger_1 = require("./config/swagger");
const auth_1 = require("./middlewares/auth");
const errorHandler_1 = require("./middlewares/errorHandler");
const requestContext_1 = require("./middlewares/requestContext");
const store_1 = require("./models/store");
const auth_2 = require("./routes/auth");
const collections_1 = require("./routes/collections");
const documents_1 = require("./routes/documents");
const hospital_1 = require("./routes/hospital");
const informedConsents_1 = require("./routes/informedConsents");
const insurance_1 = require("./routes/insurance");
const medicine_routes_1 = __importDefault(require("./routes/medicine.routes"));
const patients_1 = require("./routes/patients");
const referrals_1 = require("./routes/referrals");
const reports_1 = require("./routes/reports");
const alerts_1 = require("./routes/alerts");
const backup_1 = require("./routes/backup");
const procurement_1 = require("./routes/procurement");
const cashier_1 = require("./routes/cashier");
const users_1 = __importDefault(require("./routes/users"));
const workflows_1 = require("./routes/workflows");
const notificationService_1 = require("./services/notificationService");
const realtimeService_1 = require("./services/realtimeService");
const apiResponse_1 = require("./utils/apiResponse");
const APP_NAME = "SIPENA API";
const APP_VERSION = process.env.APP_VERSION || "2.5.0";
// Limit produksi tetap ketat. Di luar production (dev/test) dilonggarkan agar
// SPA yang memuat banyak koleksi sekaligus per halaman (plus polling berkala)
// dan suite Selenium end-to-end tidak saling menghabiskan kuota dalam satu
// window 15 menit.
const isProduction = appConfig_1.NODE_ENV === "production";
const apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    limit: isProduction ? 300 : 3000,
    standardHeaders: true,
    legacyHeaders: false,
});
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    limit: isProduction ? 20 : 100,
    standardHeaders: true,
    legacyHeaders: false,
});
function createApp() {
    const app = (0, express_1.default)();
    app.use(requestContext_1.attachRequestContext);
    app.use((0, helmet_1.default)());
    app.use((0, cors_1.default)({
        origin(origin, callback) {
            if (!origin || appConfig_1.FRONTEND_ORIGINS.includes(origin))
                return callback(null, true);
            const error = new Error(`Origin tidak diizinkan oleh CORS: ${origin}`);
            error.statusCode = 403;
            callback(error);
        },
        credentials: true,
    }));
    app.use(express_1.default.json());
    app.use("/uploads", express_1.default.static(path_1.default.resolve(__dirname, "..", "uploads")));
    // Middleware untuk membersihkan parameter URL dari query string yang menempel
    app.use(auth_1.sanitizeRequestParams);
    const apiRouter = (0, express_1.Router)();
    apiRouter.use("/auth", authLimiter, auth_2.authRouter);
    apiRouter.get("/health", (_req, res) => (0, apiResponse_1.sendSuccess)(res, { status: "ok", timestamp: new Date().toISOString() }));
    apiRouter.use(apiLimiter, auth_1.requireAuth);
    apiRouter.use("/users", users_1.default);
    apiRouter.use("/patients", patients_1.patientsRouter);
    // medicineRouter menangani endpoint spesifik ("/medicines/stock-movements") dan
    // harus dimount SEBELUM registerCollectionRoutes, sebab collection route generik
    // mendaftarkan "/medicines/:id" yang kalau lebih dulu akan menangkap semua
    // sub-path "/medicines/*" (termasuk "/stock-movements") sebelum sempat dicocokkan.
    apiRouter.use("/medicines", medicine_routes_1.default);
    // Mount sebelum registerCollectionRoutes: rute penerimaan ("/purchase-orders/:id/receive")
    // harus cocok lebih dulu sebelum collection generik menangani "/purchase-orders/:id".
    apiRouter.use("/purchase-orders", procurement_1.procurementRouter);
    // Mount sebelum registerCollectionRoutes: endpoint PDF ("/informed-consents/:id/pdf")
    // harus cocok lebih dulu sebelum collection generik menangani "/informed-consents/:id".
    apiRouter.use("/informed-consents", informedConsents_1.informedConsentsRouter);
    (0, collections_1.registerCollectionRoutes)(apiRouter);
    apiRouter.use("/reports", reports_1.reportsRouter);
    apiRouter.use("/alerts", alerts_1.alertsRouter);
    apiRouter.use("/cashier", cashier_1.cashierRouter);
    apiRouter.use("/insurance", insurance_1.insuranceRouter);
    apiRouter.use("/hospital", hospital_1.hospitalRouter);
    apiRouter.use("/documents", documents_1.documentsRouter);
    apiRouter.use("/workflows", workflows_1.workflowRouter);
    apiRouter.use("/referrals", referrals_1.referralsRouter);
    apiRouter.use("/backup", backup_1.backupRouter);
    app.use("/api", apiRouter);
    app.get("/health", (_req, res) => (0, apiResponse_1.sendSuccess)(res, { status: "ok", timestamp: new Date().toISOString() }));
    app.use(errorHandler_1.notFoundHandler);
    app.use(errorHandler_1.errorHandler);
    return app;
}
function formatDatabaseLabel() {
    const { database } = config_1.appConfig;
    if (database.socket)
        return `${database.user}@${database.socket}/${database.name}`;
    return `${database.user}@${database.host}:${database.port}/${database.name}`;
}
function formatEmailLabel() {
    if (!appConfig_1.SMTP_CONFIG.host || !appConfig_1.SMTP_CONFIG.from)
        return "tidak dikonfigurasi";
    return `${appConfig_1.SMTP_CONFIG.from} @ ${appConfig_1.SMTP_CONFIG.host}:${appConfig_1.SMTP_CONFIG.port}`;
}
function printStartupBanner(port, elapsedMs) {
    const baseUrl = (0, appConfig_1.buildBackendUrl)(port);
    const lines = [
        `  ◆  ${APP_NAME} v${APP_VERSION}  ·  ${appConfig_1.NODE_ENV}`,
        `  ──────────────────────────────────────────────`,
        `  🚀  server    ${baseUrl}`,
        `  🗄️   database  ${formatDatabaseLabel()}`,
        `  ✉️   email     ${formatEmailLabel()}`,
        `  💚  health    ${baseUrl}/health`,
        `  📁  uploads   uploads`,
        "",
        `  siap dalam ${elapsedMs} ms  ·  tekan Ctrl+C untuk berhenti`,
    ];
    console.log(lines.join("\n"));
}
async function bootstrap() {
    const startedAt = Date.now();
    await (0, store_1.initDataStore)();
    const app = createApp();
    const port = await listenOnPort(app, appConfig_1.DEFAULT_PORT);
    notificationService_1.NotificationService.startScheduler();
    const swaggerSpec = (0, swagger_1.createSwaggerSpec)(port);
    app.use("/api/docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerSpec));
    printStartupBanner(port, Date.now() - startedAt);
}
async function listenOnPort(app, port) {
    return new Promise((resolve, reject) => {
        const server = (0, http_1.createServer)(app);
        (0, realtimeService_1.setupRealtimeServer)(server);
        server.listen(port, () => {
            resolve(port);
        });
        server.on("error", (error) => {
            if (error.code === "EADDRINUSE") {
                reject(new Error(`Port ${port} sudah dipakai proses lain.\n` +
                    `  Perbaikan:\n` +
                    `  1. Cari proses yang menempati port: lsof -nP -iTCP:${port} -sTCP:LISTEN\n` +
                    `  2. Hentikan proses tersebut: kill <PID>\n` +
                    `  3. Atau jalankan backend di port lain: PORT=<port_lain> npm run dev:backend\n` +
                    `  Jika menjalankan lewat Docker, pastikan tidak ada instance lain (Docker maupun lokal) yang memakai port ${port} secara bersamaan.`));
                return;
            }
            reject(error);
        });
    });
}
if (require.main === module) {
    process.on("unhandledRejection", (reason) => {
        (0, logger_1.error)("Unhandled promise rejection", reason);
    });
    process.on("uncaughtException", (err) => {
        (0, logger_1.error)("Uncaught exception", err);
    });
    bootstrap().catch((error) => {
        console.error(`Gagal menjalankan backend: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map