import cors from "cors";
import "dotenv/config";
import express, { Router } from "express";
import { createServer } from "http";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import path from "path";
import swaggerUi from "swagger-ui-express";
import { appConfig as sharedAppConfig } from "@sistem-klinik/config";
import { DEFAULT_PORT, FRONTEND_ORIGINS, NODE_ENV, SMTP_CONFIG, buildBackendUrl } from "./config/appConfig";
import { error as logError } from "./config/logger";
import { createSwaggerSpec } from "./config/swagger";
import { requireAuth, sanitizeRequestParams } from "./middlewares/auth";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import { attachRequestContext } from "./middlewares/requestContext";
import { initDataStore } from "./models/store";
import { authRouter } from "./routes/auth";
import { registerCollectionRoutes } from "./routes/collections";
import { documentsRouter } from "./routes/documents";
import { hospitalRouter } from "./routes/hospital";
import { informedConsentsRouter } from "./routes/informedConsents";
import { insuranceRouter } from "./routes/insurance";
import medicineRouter from "./routes/medicine.routes";
import { patientsRouter } from "./routes/patients";
import { referralsRouter } from "./routes/referrals";
import { reportsRouter } from "./routes/reports";
import { alertsRouter } from "./routes/alerts";
import { backupRouter } from "./routes/backup";
import { procurementRouter } from "./routes/procurement";
import { cashierRouter } from "./routes/cashier";
import usersRouter from "./routes/users";
import { workflowRouter } from "./routes/workflows";
import { NotificationService } from "./services/notificationService";
import { setupRealtimeServer } from "./services/realtimeService";
import { sendSuccess } from "./utils/apiResponse";

const APP_NAME = "SIPENA API"
const APP_VERSION = process.env.APP_VERSION || "2.5.0"

// Limit produksi tetap ketat. Di luar production (dev/test) dilonggarkan agar
// SPA yang memuat banyak koleksi sekaligus per halaman (plus polling berkala)
// dan suite Selenium end-to-end tidak saling menghabiskan kuota dalam satu
// window 15 menit.
const isProduction = NODE_ENV === "production"
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 300 : 3000,
  standardHeaders: true,
  legacyHeaders: false,
})
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 20 : 100,
  standardHeaders: true,
  legacyHeaders: false,
})

export function createApp() {
  const app = express()
  app.use(attachRequestContext)
  app.use(helmet())
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || FRONTEND_ORIGINS.includes(origin)) return callback(null, true)
        const error = new Error(`Origin tidak diizinkan oleh CORS: ${origin}`) as Error & { statusCode: number }
        error.statusCode = 403
        callback(error)
      },
      credentials: true,
    })
  )
  app.use(express.json())
  app.use("/uploads", express.static(path.resolve(__dirname, "..", "uploads")))

  // Middleware untuk membersihkan parameter URL dari query string yang menempel
  app.use(sanitizeRequestParams);

  const apiRouter = Router()
  apiRouter.use("/auth", authLimiter, authRouter)
  apiRouter.get("/health", (_req, res) => sendSuccess(res, { status: "ok", timestamp: new Date().toISOString() }))
  apiRouter.use(apiLimiter, requireAuth)
  apiRouter.use("/users", usersRouter)
  apiRouter.use("/patients", patientsRouter)
  // medicineRouter menangani endpoint spesifik ("/medicines/stock-movements") dan
  // harus dimount SEBELUM registerCollectionRoutes, sebab collection route generik
  // mendaftarkan "/medicines/:id" yang kalau lebih dulu akan menangkap semua
  // sub-path "/medicines/*" (termasuk "/stock-movements") sebelum sempat dicocokkan.
  apiRouter.use("/medicines", medicineRouter)
  // Mount sebelum registerCollectionRoutes: rute penerimaan ("/purchase-orders/:id/receive")
  // harus cocok lebih dulu sebelum collection generik menangani "/purchase-orders/:id".
  apiRouter.use("/purchase-orders", procurementRouter)
  // Mount sebelum registerCollectionRoutes: endpoint PDF ("/informed-consents/:id/pdf")
  // harus cocok lebih dulu sebelum collection generik menangani "/informed-consents/:id".
  apiRouter.use("/informed-consents", informedConsentsRouter)
  registerCollectionRoutes(apiRouter)
  apiRouter.use("/reports", reportsRouter)
  apiRouter.use("/alerts", alertsRouter)
  apiRouter.use("/cashier", cashierRouter)
  apiRouter.use("/insurance", insuranceRouter)
  apiRouter.use("/hospital", hospitalRouter)
  apiRouter.use("/documents", documentsRouter)
  apiRouter.use("/workflows", workflowRouter)
  apiRouter.use("/referrals", referralsRouter)
  apiRouter.use("/backup", backupRouter)

  app.use("/api", apiRouter)
  app.get("/health", (_req, res) => sendSuccess(res, { status: "ok", timestamp: new Date().toISOString() }))

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

function formatDatabaseLabel() {
  const { database } = sharedAppConfig
  if (database.socket) return `${database.user}@${database.socket}/${database.name}`
  return `${database.user}@${database.host}:${database.port}/${database.name}`
}

function formatEmailLabel() {
  if (!SMTP_CONFIG.host || !SMTP_CONFIG.from) return "tidak dikonfigurasi"
  return `${SMTP_CONFIG.from} @ ${SMTP_CONFIG.host}:${SMTP_CONFIG.port}`
}

function printStartupBanner(port: number, elapsedMs: number) {
  const baseUrl = buildBackendUrl(port)
  const lines = [
    `  ◆  ${APP_NAME} v${APP_VERSION}  ·  ${NODE_ENV}`,
    `  ──────────────────────────────────────────────`,
    `  🚀  server    ${baseUrl}`,
    `  🗄️   database  ${formatDatabaseLabel()}`,
    `  ✉️   email     ${formatEmailLabel()}`,
    `  💚  health    ${baseUrl}/health`,
    `  📁  uploads   uploads`,
    "",
    `  siap dalam ${elapsedMs} ms  ·  tekan Ctrl+C untuk berhenti`,
  ]

  console.log(lines.join("\n"))
}

async function bootstrap() {
  const startedAt = Date.now()
  await initDataStore()

  const app = createApp()

  const port = await listenOnPort(app, DEFAULT_PORT)
  NotificationService.startScheduler()
  const swaggerSpec = createSwaggerSpec(port)
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec))

  printStartupBanner(port, Date.now() - startedAt)
}

async function listenOnPort(app: ReturnType<typeof express>, port: number): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const server = createServer(app)
    setupRealtimeServer(server)
    server.listen(port, () => {
      resolve(port)
    })

    server.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        reject(
          new Error(
            `Port ${port} sudah dipakai proses lain.\n` +
              `  Perbaikan:\n` +
              `  1. Cari proses yang menempati port: lsof -nP -iTCP:${port} -sTCP:LISTEN\n` +
              `  2. Hentikan proses tersebut: kill <PID>\n` +
              `  3. Atau jalankan backend di port lain: PORT=<port_lain> npm run dev:backend\n` +
              `  Jika menjalankan lewat Docker, pastikan tidak ada instance lain (Docker maupun lokal) yang memakai port ${port} secara bersamaan.`
          )
        )
        return
      }
      reject(error)
    })
  })
}

if (require.main === module) {
  process.on("unhandledRejection", (reason) => {
    logError("Unhandled promise rejection", reason)
  })
  process.on("uncaughtException", (err) => {
    logError("Uncaught exception", err)
  })

  bootstrap().catch((error) => {
    console.error(`Gagal menjalankan backend: ${error instanceof Error ? error.message : error}`)
    process.exit(1)
  })
}
