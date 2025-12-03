/**
 * Generic condition definition for filtering data
 *  @see {@link https://github.com/WesleyEdwards/simply-served/blob/main/docs/Condition.md Condition Docs}
 */
export type Condition<T> =
  | {Always: true}
  | {Never: true}
  | {Equal: T}
  | {GreaterThan: T}
  | {GreaterThanOrEqual: T}
  | {LessThan: T}
  | {LessThanOrEqual: T}
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

// type Condition2<T> =
//   | {cond: "always"}
//   | {cond: "never"}
//   | {cond: "equal"; value: T}
//   | {cond: "gt"; value: T}
//   | {cond: "gte"; value: T}
//   | {cond: "lt"; value: T}
//   | {cond: "lte"; value: T}
//   | {cond: "inside"; value: T[]}
//   | {cond: "or"; value: Condition<T>[]}
//   | {cond: "and"; value: Condition<T>[]}
//   | {cond: "listAny"; value: T extends (infer U)[] ? Condition<U> : never}
//   | {cond: "listEvery"; value: T extends (infer U)[] ? Condition<U> : never}
//   | {
//       cond: "string"
//       contains: T extends string ? string : never
//       ignoreCase: T extends string ? boolean : never
//     }
