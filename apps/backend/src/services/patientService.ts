import type { Patient } from "../types";
import { CollectionService } from "./collectionService";

export class PatientService {
  static async list(): Promise<Patient[]> {
    return CollectionService.list("patients")
  }

  static async findById(id: string): Promise<Patient | null> {
    return CollectionService.findById("patients", id)
  }

  static async create(payload: Omit<Patient, "id" | "createdAt" | "updatedAt">): Promise<Patient> {
    return CollectionService.createItem("patients", payload)
  }

  static async update(id: string, payload: Partial<Patient>): Promise<Patient | null> {
    return CollectionService.updateItem("patients", id, payload)
  }

  static async remove(id: string): Promise<boolean> {
    return CollectionService.deleteItem("patients", id)
  }
}
