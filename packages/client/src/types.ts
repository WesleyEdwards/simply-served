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

export type Method = "GET" | "PUT" | "POST" | "DELETE"

export type Fetcher = <Body, T>(
  path: string,
  method: Method,
  body?: Body
) => Promise<T>


export type Query<T> = {
  condition?: Condition<T>
  limit?: number
  skip?: number
}


export type Modification<T> = Partial<T>