import { Condition } from "condition"

export type Query<T> = {
  condition?: Condition<T>
  limit?: number
  skip?: number
}
