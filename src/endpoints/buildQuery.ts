import {Parsable} from "../server/validation"
import {EndpointBuilderType} from "../server/controller"
import {ServerContext} from "../server/simpleServer"

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
 * 'skipAuth?: false' indicates that auth is required for this endpoint
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
 * 'skipAuth: true' indicates that auth is NOT required for this endpoint
 */
export function buildQuery<
  C extends ServerContext = ServerContext,
  T = any
>(params: {
  validator?: Parsable<T>
  fun: EndpointBuilderType<C, T, true>
  authOptions: {type: "publicAccess"}
}): BuildQueryReturn<C, T, true>

/**
 * whether skipAuth is true or not determines if the auth is checked
 */
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
      // Test validation
      params.validator.parse(info.req.body)
    }
    return params.fun(info)
  }

  return {
    fun: intermediateValidation,
    authOptions: params.authOptions,
  }
}
