/**
 * Menguji lapisan persistensi per-record di models/store.ts.
 *
 * Fokus: memastikan mutasi satu record TIDAK menulis ulang seluruh tabel
 * (pola lama "DELETE FROM tabel" + insert semua baris) dan dijalankan dalam
 * satu transaksi yang di-commit, serta di-rollback bila terjadi kegagalan.
 */

type QueryCall = { sql: string; params?: unknown[] }

const queries: QueryCall[] = []
let commit: jest.Mock
let rollback: jest.Mock
let release: jest.Mock
let beginTransaction: jest.Mock
let failOnSql: RegExp | null = null

const connectionQuery = jest.fn(async (sql: string, params?: unknown[]) => {
  queries.push({ sql, params })
  if (failOnSql && failOnSql.test(sql)) {
    throw new Error("simulated failure")
  }
  return [{ affectedRows: 1 }]
})

jest.mock("../config/mysqlClient", () => ({
  __esModule: true,
  default: {
    // readCollection memakai ini; tidak dipakai di test tulis.
    query: jest.fn(async () => [[]]),
    getConnection: jest.fn(async () => ({
      beginTransaction,
      commit,
      rollback,
      release,
      query: connectionQuery,
    })),
  },
}))

import { deleteOne, insertOne, updateOne } from "../models/store"

beforeEach(() => {
  queries.length = 0
  failOnSql = null
  beginTransaction = jest.fn(async () => undefined)
  commit = jest.fn(async () => undefined)
  rollback = jest.fn(async () => undefined)
  release = jest.fn(async () => undefined)
  connectionQuery.mockClear()
})

const sqls = () => queries.map((q) => q.sql)

describe("insertOne", () => {
  it("hanya menyisipkan satu baris di dalam transaksi, tanpa menghapus tabel", async () => {
    await insertOne("patients", { id: "p1", name: "Budi" } as never)

    expect(beginTransaction).toHaveBeenCalledTimes(1)
    expect(commit).toHaveBeenCalledTimes(1)
    expect(rollback).not.toHaveBeenCalled()
    expect(release).toHaveBeenCalledTimes(1)

    expect(sqls().some((s) => /INSERT INTO `patients`/.test(s))).toBe(true)
    // Tidak boleh ada penghapusan seluruh tabel.
    expect(sqls().some((s) => /DELETE FROM `patients`\s*$/.test(s.trim()))).toBe(false)
  })
})

describe("updateOne", () => {
  it("memperbarui hanya baris dengan id terkait, bukan menulis ulang tabel", async () => {
    await updateOne("patients", "p1", { id: "p1", name: "Budi Baru" } as never)

    const update = queries.find((q) => /UPDATE `patients` SET \? WHERE id = \?/.test(q.sql))
    expect(update).toBeDefined()
    expect(update?.params?.[1]).toBe("p1")
    // id tidak boleh ikut di-SET.
    expect((update?.params?.[0] as Record<string, unknown>).id).toBeUndefined()
    expect(commit).toHaveBeenCalledTimes(1)
  })
})

describe("deleteOne", () => {
  it("menghapus berdasarkan id dan mengembalikan true saat ada baris terpengaruh", async () => {
    const result = await deleteOne("patients", "p1")

    expect(result).toBe(true)
    const del = queries.find((q) => /DELETE FROM `patients` WHERE id = \?/.test(q.sql))
    expect(del).toBeDefined()
    expect(del?.params?.[0]).toBe("p1")
    expect(commit).toHaveBeenCalledTimes(1)
  })
})

describe("penanganan kegagalan", () => {
  it("melakukan rollback dan tidak commit bila query gagal", async () => {
    failOnSql = /INSERT INTO `patients`/
    await expect(insertOne("patients", { id: "p1", name: "Budi" } as never)).rejects.toThrow("simulated failure")

    expect(rollback).toHaveBeenCalledTimes(1)
    expect(commit).not.toHaveBeenCalled()
    expect(release).toHaveBeenCalledTimes(1)
  })
})
