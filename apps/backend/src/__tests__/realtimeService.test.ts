import { signAuthToken } from "../middlewares/auth"
import { authenticateHandshake } from "../services/realtimeService"
import { AUTH_COOKIE_NAME } from "../config/appConfig"

const user = { id: "user-1", username: "perawat1", role: "perawat" as const }

describe("authenticateHandshake", () => {
  it("menerima token valid dari handshake.auth (bearer)", () => {
    const token = signAuthToken(user)
    const payload = authenticateHandshake({ auth: { token }, headers: {} })
    expect(payload).toMatchObject({ id: user.id, username: user.username, role: user.role })
  })

  it("menerima token valid dari cookie auth", () => {
    const token = signAuthToken(user)
    const payload = authenticateHandshake({
      headers: { cookie: `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}` },
    })
    expect(payload).toMatchObject({ id: user.id, role: user.role })
  })

  it("mengutamakan bearer token dibanding cookie", () => {
    const token = signAuthToken(user)
    const payload = authenticateHandshake({
      auth: { token },
      headers: { cookie: `${AUTH_COOKIE_NAME}=token-cookie-tidak-valid` },
    })
    expect(payload.id).toBe(user.id)
  })

  it("menolak handshake tanpa token", () => {
    expect(() => authenticateHandshake({ headers: {} })).toThrow("Otentikasi realtime diperlukan.")
  })

  it("menolak token yang tidak valid", () => {
    expect(() =>
      authenticateHandshake({ auth: { token: "token.jwt.palsu" }, headers: {} }),
    ).toThrow("Sesi realtime tidak valid atau kedaluwarsa.")
  })

  it("mengabaikan auth.token non-string", () => {
    expect(() =>
      authenticateHandshake({ auth: { token: 12345 as unknown as string }, headers: {} }),
    ).toThrow("Otentikasi realtime diperlukan.")
  })
})
