import {Parsable} from "../server/validation"
import {EndpointBuilderType} from "../server/controller"
import {ServerContext} from "../server/simpleServer"
import {ParseError} from "../server"

export type AuthOptions<C extends ServerContext> =
  | {type: "publicAccess"}
  | {type: "notAllowed"}
  | {type: "authenticated"}
  | {type: "customAuth"; check: (auth: C["auth"]) => boolean}

export type BuildQueryReturn<
  C extends ServerContext = ServerContext,
  T = any,
  SkipAuth extends boolean = false
> = {
  fun: EndpointBuilderType<C, T, SkipAuth>
  authOptions: AuthOptions<C>
}

/**
 * Auth is required for this endpoint
 */
export function buildQuery<
  C extends ServerContext = ServerContext,
  T = any
>(params: {
  validator?: Parsable<T>
  fun: EndpointBuilderType<C, T, false>
  authOptions:
    | {type: "customAuth"; check: (auth: C["auth"]) => boolean}
    | {type: "authenticated"}
}): BuildQueryReturn<C, T, false>

/**
 * Auth is NOT required for this endpoint
 */
export function buildQuery<
  C extends ServerContext = ServerContext,
  T = any
>(params: {
  validator?: Parsable<T>
  fun: EndpointBuilderType<C, T, true>
  authOptions: {type: "publicAccess"}
}): BuildQueryReturn<C, T, true>

export function buildQuery<
  C extends ServerContext = ServerContext,
  T = any
>(params: {
  authOptions: AuthOptions<C>

  validator?: Parsable<T>
  fun: EndpointBuilderType<C, T, boolean>
}): BuildQueryReturn<C, T, boolean>

export function buildQuery<
  C extends ServerContext = ServerContext,
  T = any,
  SkipAuth extends boolean = true | false
>(params: any): BuildQueryReturn<C, T, SkipAuth> {
  const intermediateValidation: EndpointBuilderType<C, T, SkipAuth> = async (
    info
  ) => {
    if (params.validator) {
      try {
        // Test validation
        params.validator.parse(info.req.body)
      } catch (e: any) {
        if ("message" in e) {
          throw new ParseError(e.message)
        }
        if ("errors" in e && typeof e.errors === "object") {
          // Probably Zod Error
          throw new ParseError(JSON.stringify(e.errors))
        }
      }
    }
    return params.fun(info)
  }

  return {
    fun: intermediateValidation,
    authOptions: params.authOptions,
  }
}
