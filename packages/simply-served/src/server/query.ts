import {Condition} from "condition"

export type SortOrder = "asc" | "desc"

export type Sort<T> = {
  field: keyof T & string
  order: SortOrder
}

export type Query<T> = {
  condition?: Condition<T>
  limit?: number
  skip?: number
  sort?: Sort<T>[]
}
