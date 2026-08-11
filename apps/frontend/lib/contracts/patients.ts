import type { Patient } from "../auth-types";

export type CreatePatientInput = Omit<Patient, "id" | "createdAt" | "updatedAt">
export type UpdatePatientInput = Partial<Patient>
