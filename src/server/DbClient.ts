import {Condition} from "../condition"

export type HasId = {
  _id: string
}

export type DbMethods<T extends HasId> = {
  findOneById: (id: string) => Promise<T>
  findOne: (filter: Condition<T>) => Promise<T>
  findMany: (filter: Condition<T>) => Promise<T[]>
  insertOne: (item: T) => Promise<T>
  updateOne: (id: string, update: Partial<T>) => Promise<T>
  deleteOne: (id: string) => Promise<T>
}
