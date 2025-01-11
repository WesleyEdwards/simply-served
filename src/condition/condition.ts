export type Condition<T> =
  | {Always: true}
  | {Never: true}
  | {Equal: T}
  | {Inside: T[]}
  | {Or: Array<Condition<T>>}
  | {And: Array<Condition<T>>}
  | {ListAnyElement: T extends (infer U)[] ? Condition<U> : never}
  | {[P in keyof T]?: Condition<T[P]>}
