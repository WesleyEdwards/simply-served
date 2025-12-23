import {Condition} from "../condition"
import {Query} from "./query"

export type HasId = {
  _id: string
}

export type DbMethods<T extends HasId> = {
  findOneById: (id: string) => Promise<T>
  findOne: (filter: Condition<T>) => Promise<T>
  findMany: (filter: Query<T>) => Promise<T[]>
  insertOne: (item: T) => Promise<T>
  insertMany: (items: T[]) => Promise<T[]>
  updateOne: (id: string, update: Partial<T>) => Promise<T>
  deleteOne: (id: string) => Promise<T>
}
