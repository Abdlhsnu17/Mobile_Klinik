const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"

type RedisClientShape = {
  connect(): Promise<void>
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<string | null>
  on(event: "error" | "end", listener: (error?: Error) => void): void
}

type RedisModuleShape = {
  createClient(options: {
    url?: string
    socket?: {
      connectTimeout?: number
      reconnectStrategy?: false | ((retries: number) => false | number | Error)
    }
  }): RedisClientShape
}

let redisModule: RedisModuleShape | null | undefined
let redisClient: RedisClientShape | null = null
let isReady = false
let pendingConnect: Promise<void> | null = null
let hasLoggedConnectionError = false
let isDisabled = false

async function loadRedisModule(): Promise<RedisModuleShape | null> {
  if (redisModule !== undefined) return redisModule

  try {
    const mod = (await import("redis")) as unknown as RedisModuleShape
    redisModule = mod
    return mod
  } catch (error) {
    redisModule = null
    return null
  }
}

async function ensureClientCreated() {
  if (isDisabled) return
  if (redisClient) return

  const mod = await loadRedisModule()
  if (!mod) {
    isDisabled = true
    return
  }

  redisClient = mod.createClient({
    url: REDIS_URL,
    socket: {
      connectTimeout: 1000,
      reconnectStrategy: false,
    },
  })
  redisClient.on("error", (error) => {
    if (hasLoggedConnectionError) return
    hasLoggedConnectionError = true
    console.warn("[redis] connection error:", error?.message ?? error)
  })
  redisClient.on("end", () => {
    isReady = false
  })
}

async function ensureConnected() {
  if (isDisabled) return
  if (isReady) return
  if (pendingConnect) {
    await pendingConnect
    return
  }

  pendingConnect = (async () => {
    try {
      await ensureClientCreated()
      if (!redisClient) return
      await redisClient.connect()
      isReady = true
    } catch (error) {
      console.warn("[redis] unable to connect:", (error as Error)?.message ?? error)
      isDisabled = true
      redisClient = null
    } finally {
      pendingConnect = null
    }
  })()

  await pendingConnect
}

export async function getRedisClient() {
  try {
    await ensureConnected()
  } catch (error) {
    console.warn("[redis] unexpected error before connect:", error)
  }
  return isReady ? redisClient : null
}
