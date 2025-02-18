/**
 * https://github.com/WesleyEdwards/simply-served/blob/main/docs/Condition.md
 *
 * Generic condition definition for filtering data
 */
export type Condition<T> =
  | {Always: true}
  | {Never: true}
  | {Equal: T}
  | {Inside: T[]}
  | {Or: Array<Condition<T>>}
  | {And: Array<Condition<T>>}
  | {ListAnyElement: T extends (infer U)[] ? Condition<U> : never}
  | {
      StringContains: T extends string
        ? {value: string; ignoreCase: boolean}
        : never
    }
  | {[P in keyof T]?: Condition<T[P]>}
