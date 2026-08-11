import { apiClient } from "../api-client";
import type { Patient } from "../auth-types";
import type { CreatePatientInput, UpdatePatientInput } from "../contracts/patients";

type CacheEntry<T> = {
  data: T
  timestamp: number
}

const CACHE_DURATION_MS = 5 * 60 * 1000
let patientsCache: CacheEntry<Patient[]> | null = null

function isCacheExpired(entry: CacheEntry<Patient[]> | null): boolean {
  if (!entry) return true
  return Date.now() - entry.timestamp > CACHE_DURATION_MS
}

export function clearPatientsCache() {
  patientsCache = null
}

export async function getPatients(): Promise<Patient[]> {
  if (!isCacheExpired(patientsCache)) {
    return patientsCache!.data
  }

  try {
    const data = await apiClient.getPatients()
    patientsCache = { data, timestamp: Date.now() }
    return data
  } catch (error) {
    if (error instanceof Error && error.message.includes("Anda tidak memiliki akses")) {
      return []
    }
    throw error
  }
}

export async function getPatient(id: string): Promise<Patient> {
  return apiClient.getPatient(id)
}

export async function createPatient(patient: CreatePatientInput): Promise<Patient> {
  const created = await apiClient.createPatient(patient)
  clearPatientsCache()
  return created
}

export async function updatePatient(id: string, payload: UpdatePatientInput): Promise<Patient> {
  const updated = await apiClient.updatePatient(id, payload)
  clearPatientsCache()
  return updated
}

export async function deletePatient(id: string): Promise<void> {
  await apiClient.deletePatient(id)
  clearPatientsCache()
}

export async function generateNoRM(): Promise<string> {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const patients = await getPatients()
  const count = (patients.length + 1).toString().padStart(4, "0")
  return `RM${year}${month}${count}`
}
