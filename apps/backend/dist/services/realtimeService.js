"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateHandshake = authenticateHandshake;
exports.setupRealtimeServer = setupRealtimeServer;
exports.publishQueueChange = publishQueueChange;
const socket_io_1 = require("socket.io");
const appConfig_1 = require("../config/appConfig");
const auth_1 = require("../middlewares/auth");
let io = null;
/**
 * Memvalidasi handshake Socket.IO menggunakan JWT dari bearer token maupun
 * cookie auth. Fungsi murni (tanpa efek samping) agar mudah diuji.
 * Melempar Error dengan pesan yang aman untuk dikirim ke klien saat gagal.
 */
function authenticateHandshake(handshake) {
    const bearer = typeof handshake.auth?.token === "string" ? handshake.auth.token : undefined;
    const token = bearer || (0, auth_1.parseCookie)(handshake.headers.cookie, appConfig_1.AUTH_COOKIE_NAME);
    if (!token)
        throw new Error("Otentikasi realtime diperlukan.");
    try {
        return (0, auth_1.verifyAuthToken)(token);
    }
    catch {
        throw new Error("Sesi realtime tidak valid atau kedaluwarsa.");
    }
}
function setupRealtimeServer(server) {
    io = new socket_io_1.Server(server, {
        path: "/socket.io",
        cors: { origin: appConfig_1.FRONTEND_ORIGINS, credentials: true },
    });
    io.use((socket, next) => {
        try {
            socket.data.user = authenticateHandshake(socket.handshake);
            next();
        }
        catch (error) {
            next(error);
        }
    });
    io.on("connection", (socket) => {
        socket.join("queue");
    });
}
function publishQueueChange(change) {
    io?.to("queue").emit("queue:changed", change);
}
//# sourceMappingURL=realtimeService.js.map