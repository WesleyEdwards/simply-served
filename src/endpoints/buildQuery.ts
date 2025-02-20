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
  A extends AuthOptions<C> = any
> = {
  fun: EndpointBuilderType<C, T, A>
  authOptions: AuthOptions<C>
  path: `/${string}`
  method: "post" | "put" | "get" | "delete"
}

type BuildType<C extends ServerContext, T, A extends AuthOptions<C>> = (
  params: EndpointBuilderType<C, T, A>
) => BuildQueryReturn<C, T, A>

type OptionsType<C extends ServerContext> = <
  T = any,
  A extends AuthOptions<C> = {
    type: "authenticated"
  }
>(params: {
  validator?: Parsable<T>
  authOptions: A
}) => {
  build: BuildType<C, T, A>
}

export function buildQuery<C extends ServerContext = ServerContext>(params: {
  path: `/${string}`
  method: "post" | "put" | "get" | "delete"
}): {
  options: OptionsType<C>
} {
  return {
    options: (optionsParams) => ({
      build: (builder) => ({
        authOptions: optionsParams.authOptions,
        fun: (info) => {
          if (optionsParams.validator) {
            try {
              // Test validation
              optionsParams.validator.parse(info.req.body)
            } catch (e: any) {
              if ("message" in e) {
                throw new ParseError(e.message)
              }
            }
          }
          return builder(info)
        },
        method: params.method,
        path: params.path,
      }),
    }),
  }
}
