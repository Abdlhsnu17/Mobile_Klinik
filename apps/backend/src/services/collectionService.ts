import type { CollectionName, DefaultData } from "../models/defaultData"
import { CollectionRepository } from "../repositories/collectionRepository"
import { generateId, getNextQueueNumber, now } from "../utils"
import { publishQueueChange } from "./realtimeService"

type ItemOf<K extends CollectionName> = DefaultData[K][number]

export class CollectionService {
  static async list<K extends CollectionName>(collection: K): Promise<DefaultData[K]> {
    return await CollectionRepository.findAll(collection)
  }

  static async findById<K extends CollectionName>(collection: K, id: string): Promise<ItemOf<K> | null> {
    return CollectionRepository.findById(collection, id)
  }

  static async createItem<K extends CollectionName>(collection: K, payload: Partial<ItemOf<K>>): Promise<ItemOf<K>> {
    const data = await CollectionRepository.findAll(collection)
    const item = this.buildItem(collection, payload, data)
    const created = await CollectionRepository.insert(collection, item)
    if (collection === "appointments") {
      publishQueueChange({ action: "created", appointmentId: generatedItemId(created), occurredAt: now() })
    }
    return created
  }

  static async updateItem<K extends CollectionName>(collection: K, id: string, payload: Partial<ItemOf<K>>): Promise<ItemOf<K> | null> {
    const existing = await CollectionRepository.findById(collection, id)
    if (!existing) return null
    const updated = { ...existing, ...(payload as ItemOf<K>), updatedAt: now() } as ItemOf<K>
    const result = await CollectionRepository.update(collection, id, updated)
    if (collection === "appointments" && result) {
      publishQueueChange({ action: "updated", appointmentId: id, occurredAt: now() })
    }
    return result
  }

  static async deleteItem<K extends CollectionName>(collection: K, id: string): Promise<boolean> {
    const deleted = await CollectionRepository.delete(collection, id)
    if (collection === "appointments" && deleted) {
      publishQueueChange({ action: "deleted", appointmentId: id, occurredAt: now() })
    }
    return deleted
  }

  private static buildItem<K extends CollectionName>(collection: K, payload: Partial<ItemOf<K>>, existing: DefaultData[K]): ItemOf<K> {
    const identifiable = payload as Partial<{ id: string; createdAt: string }>
    const generatedId = identifiable.id || generateId()
    const createdAt = identifiable.createdAt || now()
    const normalized = { ...(payload as ItemOf<K>), id: generatedId, createdAt } as ItemOf<K>

    if (collection === "appointments") {
      const appointment = normalized as ItemOf<K> & { queueNumber?: number; date?: string }
      const date = appointment.date || new Date().toISOString().split("T")[0]
      const queueNumber = appointment.queueNumber ?? getNextQueueNumber(date, existing as DefaultData["appointments"])
      Object.assign(appointment, { date, queueNumber })
      return appointment as ItemOf<K>
    }

    if (["patients", "medicines", "medicalRecords", "radiologyOrders", "clinicalDocuments"].includes(collection)) {
      ;(normalized as ItemOf<K> & { updatedAt?: string }).updatedAt = now()
    }

    if (collection === "radiologyOrders") {
      const order = normalized as ItemOf<K> & { priority?: string; status?: string; requestedAt?: string }
      Object.assign(order, {
        priority: order.priority ?? "routine",
        status: order.status ?? "requested",
        requestedAt: order.requestedAt ?? now(),
      })
    }

    if (collection === "clinicalDocuments") {
      const document = normalized as ItemOf<K> & { status?: string }
      Object.assign(document, {
        status: document.status ?? "draft",
      })
    }

    return normalized
  }
}

function generatedItemId(item: unknown) {
  return (item as { id: string }).id
}
