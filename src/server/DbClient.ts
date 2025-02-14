import {Condition} from "../condition"

export type HasId = {
  _id: string
}

export type MaybeError<T> =
  | {success: true; data: T}
  | {success: false; error: any}

export type DbQueries<T extends HasId> = {
  findOneById: (id: string) => Promise<MaybeError<T>>
  findOne: (filter: Condition<T>) => Promise<MaybeError<T>>
  findMany: (filter: Condition<T>) => Promise<T[]>
  insertOne: (item: T) => Promise<MaybeError<T>>
  updateOne: (id: string, update: Partial<T>) => Promise<MaybeError<T>>
  deleteOne: (id: string) => Promise<T>
}

export type DbMethods<T extends HasId> = {
  findOneById: (id: string) => Promise<T>
  findOne: (filter: Condition<T>) => Promise<T>
  findMany: (filter: Condition<T>) => Promise<T[]>
  insertOne: (item: T) => Promise<T>
  updateOne: (id: string, update: Partial<T>) => Promise<T>
  deleteOne: (id: string) => Promise<T>
}
