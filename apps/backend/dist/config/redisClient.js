"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisClient = getRedisClient;
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let redisModule;
let redisClient = null;
let isReady = false;
let pendingConnect = null;
let hasLoggedConnectionError = false;
let isDisabled = false;
async function loadRedisModule() {
    if (redisModule !== undefined)
        return redisModule;
    try {
        const mod = (await import("redis"));
        redisModule = mod;
        return mod;
    }
    catch (error) {
        redisModule = null;
        return null;
    }
}
async function ensureClientCreated() {
    if (isDisabled)
        return;
    if (redisClient)
        return;
    const mod = await loadRedisModule();
    if (!mod) {
        isDisabled = true;
        return;
    }
    redisClient = mod.createClient({
        url: REDIS_URL,
        socket: {
            connectTimeout: 1000,
            reconnectStrategy: false,
        },
    });
    redisClient.on("error", (error) => {
        if (hasLoggedConnectionError)
            return;
        hasLoggedConnectionError = true;
        console.warn("[redis] connection error:", error?.message ?? error);
    });
    redisClient.on("end", () => {
        isReady = false;
    });
}
async function ensureConnected() {
    if (isDisabled)
        return;
    if (isReady)
        return;
    if (pendingConnect) {
        await pendingConnect;
        return;
    }
    pendingConnect = (async () => {
        try {
            await ensureClientCreated();
            if (!redisClient)
                return;
            await redisClient.connect();
            isReady = true;
        }
        catch (error) {
            console.warn("[redis] unable to connect:", error?.message ?? error);
            isDisabled = true;
            redisClient = null;
        }
        finally {
            pendingConnect = null;
        }
    })();
    await pendingConnect;
}
async function getRedisClient() {
    try {
        await ensureConnected();
    }
    catch (error) {
        console.warn("[redis] unexpected error before connect:", error);
    }
    return isReady ? redisClient : null;
}
//# sourceMappingURL=redisClient.js.map