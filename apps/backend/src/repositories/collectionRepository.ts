import type { CollectionName, DefaultData } from "../models/defaultData";
import { deleteOne, insertOne, readCollection, updateOne } from "../models/store";

type ItemOf<K extends CollectionName> = DefaultData[K][number];

export class CollectionRepository {
  static async findAll<K extends CollectionName>(collection: K): Promise<DefaultData[K]> {
    return readCollection(collection);
  }

  static async findById<K extends CollectionName>(collection: K, id: string): Promise<ItemOf<K> | null> {
    const data = await this.findAll(collection);
    return data.find((record) => record.id === id) ?? null;
  }

  static async insert<K extends CollectionName>(collection: K, item: ItemOf<K>): Promise<ItemOf<K>> {
    await insertOne(collection, item);
    return item;
  }

  static async update<K extends CollectionName>(collection: K, id: string, item: ItemOf<K>): Promise<ItemOf<K> | null> {
    await updateOne(collection, id, item);
    return item;
  }

  static async delete<K extends CollectionName>(collection: K, id: string): Promise<boolean> {
    return deleteOne(collection, id);
  }
}
