#!/usr/bin/env node

const { execFileSync } = require("node:child_process")

const requestedPorts = process.argv.slice(2)
const ports = requestedPorts.length > 0 ? requestedPorts : [process.env.PORT || "4004"]
const wait = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)

function getListeningPids(port) {
  try {
    const output = execFileSync("lsof", ["-tiTCP:" + port, "-sTCP:LISTEN"], { encoding: "utf8" }).trim()
    return output
      .split(/\s+/)
      .map((pid) => pid.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

for (const port of ports) {
  if (!/^\d+$/.test(port)) {
    console.error(`[dev] Invalid port: ${port}`)
    process.exit(1)
  }

  const pids = getListeningPids(port)

  for (const pid of pids) {
    try {
      process.kill(Number(pid), "SIGTERM")
      console.log(`[dev] Stopped old process on port ${port} (PID ${pid})`)
    } catch (error) {
      if (error.code !== "ESRCH") {
        console.warn(`[dev] Failed to stop PID ${pid} on port ${port}: ${error.message}`)
      }
    }
  }

  for (let attempt = 0; attempt < 25; attempt += 1) {
    if (getListeningPids(port).length === 0) break
    wait(200)
  }

  const remainingPids = getListeningPids(port)
  for (const pid of remainingPids) {
    try {
      process.kill(Number(pid), "SIGKILL")
      console.log(`[dev] Force-stopped old process on port ${port} (PID ${pid})`)
    } catch (error) {
      if (error.code !== "ESRCH") {
        console.warn(`[dev] Failed to force-stop PID ${pid} on port ${port}: ${error.message}`)
      }
    }
  }
}
