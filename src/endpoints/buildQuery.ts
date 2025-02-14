import {checkValidSchema, isValid, SafeParsable} from "../server/validation"
import {EndpointBuilderType} from "../server/controller"
import {ServerContext} from "../server/simpleServer"
import {Condition} from "../condition"
import {InvalidRequestError} from "../server"

export type AuthOptions<C extends ServerContext> =
  | {skipAuth: true}
  | {auth: (auth: C["auth"]) => Condition<C["auth"]>}
  | undefined

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
  validator?: SafeParsable<T>
  fun: EndpointBuilderType<C, T, false>
  authOptions?: {auth: (auth: C["auth"]) => Condition<C["auth"]>}
}): BuildQueryReturn<C, T, false>

/**
 * 'skipAuth: true' indicates that auth is NOT required for this endpoint
 */
export function buildQuery<
  C extends ServerContext = ServerContext,
  T = any
>(params: {
  validator?: SafeParsable<T>
  fun: EndpointBuilderType<C, T, true>
  authOptions: {skipAuth: true}
}): BuildQueryReturn<C, T, true>

/**
 * whether skipAuth is true or not determines if the auth is checked
 */
export function buildQuery<
  C extends ServerContext = ServerContext,
  T = any
>(params: {
  authOptions?:
    | {skipAuth: true}
    | {auth: (auth: C["auth"]) => Condition<C["auth"]>}

  validator?: SafeParsable<T>
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
      const valid = checkValidSchema(info.req.body, params.validator)
      if (!isValid(valid)) {
        throw new InvalidRequestError(valid ?? "Error parsing body")
      }
    }
    return params.fun(info)
  }

  return {
    fun: intermediateValidation,
    authOptions: params.authOptions,
  }
}
