import {ServerContext} from "../server"

export type Has<T, U> = Extract<T, U> extends never ? false : true

export type When<T extends boolean, U, V = never> =
  | (Has<Has<T, true>, true> extends true ? U : never)
  | (Has<Has<T, false>, true> extends true ? V : never)

export type IncludeAllKeys<T extends object> = {
  [K in keyof T]-?: Exclude<T[K], undefined>
}

export type OptionalAuth<C extends ServerContext> = {
  [K in keyof C]: K extends "auth" ? C["auth"] | undefined : C[K]
}

export type WithoutAuth<C extends ServerContext> = {
  [K in keyof C as K extends "auth" ? never : K]: C[K]
}
