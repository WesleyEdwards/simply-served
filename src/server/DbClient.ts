import {Condition} from "../condition"

export type HasId = {
  _id: string
}

export type MaybeError<T> =
  | {success: true; data: T}
  | {success: false; error: any}

export type DbQueries<T extends HasId> = {
  findOne: (filter: Condition<T>) => Promise<MaybeError<T>>
  findMany: (filter: Condition<T>) => Promise<T[]>
  insertOne: (item: T) => Promise<MaybeError<T>>
  updateOne: (id: string, update: Partial<T>) => Promise<MaybeError<T>>
  deleteOne: (id: string) => Promise<T>
}
