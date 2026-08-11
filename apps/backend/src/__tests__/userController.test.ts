import type { Request, Response } from "express"
import * as userController from "../controllers/userController"
import * as userService from "../services/userService"

jest.mock("../services/userService")

const mockedUserService = userService as jest.Mocked<typeof userService>

function createMockResponse() {
  const res: Partial<Response> = {
    req: {} as Request,
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  }
  return res as Response
}

describe("userController.updateAvatar", () => {
  it("meneruskan error 401 ketika user tidak terautentikasi", async () => {
    const req = { user: undefined, file: undefined } as unknown as Request
    const res = createMockResponse()
    const next = jest.fn()

    await userController.updateAvatar(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }))
    expect(mockedUserService.updateAvatar).not.toHaveBeenCalled()
  })

  it("meneruskan error 400 ketika file tidak ada", async () => {
    const req = { user: { id: "user-1" }, file: undefined } as unknown as Request
    const res = createMockResponse()
    const next = jest.fn()

    await userController.updateAvatar(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }))
    expect(mockedUserService.updateAvatar).not.toHaveBeenCalled()
  })

  it("berhasil memperbarui avatar dan mengembalikan user tanpa password", async () => {
    const req = {
      user: { id: "user-1" },
      file: { path: "/uploads/avatars/user-1-123.jpg" },
    } as unknown as Request
    const res = createMockResponse()
    const next = jest.fn()

    mockedUserService.updateAvatar.mockResolvedValue({
      id: "user-1",
      username: "budi",
      name: "Budi",
      email: "budi@example.com",
      role: "umum",
      password: "hashed-password",
      createdAt: new Date().toISOString(),
      avatarUrl: "/uploads/avatars/user-1-123.jpg",
    } as any)

    await userController.updateAvatar(req, res, next)

    expect(mockedUserService.updateAvatar).toHaveBeenCalledWith("user-1", "/uploads/avatars/user-1-123.jpg")
    expect(next).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          user: expect.objectContaining({ username: "budi" }),
        }),
      })
    )
    const jsonCall = (res.json as jest.Mock).mock.calls[0][0]
    expect(jsonCall.data.user.password).toBeUndefined()
  })
})
