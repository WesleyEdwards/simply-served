import {Condition} from "./condition/condition"

export type HasId = {
  _id: string
}

export type OrError<T> = T | {error: string}

export type DbQueries<T extends HasId> = {
  findOne: (filter: Condition<T>) => Promise<OrError<T>>
  findMany: (filter: Condition<T>) => Promise<T[]>
  insertOne: (item: T) => Promise<OrError<T>>
  updateOne: (id: string, update: Partial<T>) => Promise<OrError<T>>
  deleteOne: (id: string, condition?: Condition<T>) => Promise<T>
}
