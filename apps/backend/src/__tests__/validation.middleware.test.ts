import express from "express"
import request from "supertest"
import { body } from "express-validator"
import { validate, requireNonEmptyBody } from "../middlewares/validate"

function buildTestApp(middleware: express.RequestHandler) {
  const app = express()
  app.use(express.json())
  app.post("/test", middleware, (req, res) => res.json({ ok: true }))
  return app
}

describe("validate middleware", () => {
  it("mengembalikan 400 jika rule gagal", async () => {
    const app = buildTestApp(validate([body("name").isString().notEmpty()]))
    const res = await request(app).post("/test").send({})
    expect(res.status).toBe(400)
    expect(res.body.error.details).toBeDefined()
  })

  it("lanjut ke handler jika rule lolos", async () => {
    const app = buildTestApp(validate([body("name").isString().notEmpty()]))
    const res = await request(app).post("/test").send({ name: "Budi" })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})

describe("requireNonEmptyBody middleware", () => {
  it("menolak body kosong", async () => {
    const app = buildTestApp(requireNonEmptyBody)
    const res = await request(app).post("/test").send({})
    expect(res.status).toBe(400)
  })

  it("menerima body yang berisi data", async () => {
    const app = buildTestApp(requireNonEmptyBody)
    const res = await request(app).post("/test").send({ foo: "bar" })
    expect(res.status).toBe(200)
  })
})
