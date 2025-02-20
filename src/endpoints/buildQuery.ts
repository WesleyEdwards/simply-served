import {Parsable} from "../server/validation"
import {EndpointBuilderType, Route} from "../server/controller"
import {Controller, ServerContext} from "../server/simpleServer"
import {BuilderParams, HasId, modelRestEndpoints, ParseError} from "../server"

export type AuthOptions<C extends ServerContext> =
  | {type: "publicAccess"}
  | {type: "notAllowed"}
  | {type: "authenticated"}
  | {type: "customAuth"; check: (auth: C["auth"]) => boolean}

type BuildType<C extends ServerContext, T, A extends AuthOptions<C>> = (
  params: EndpointBuilderType<C, T, A>
) => Route<C, T, A>

type OptionsType<C extends ServerContext> = <
  T,
  A extends AuthOptions<C>
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

// Functions for typing niceness
export const createControllers = <C extends ServerContext>(
  builder: (builders: {
    createController: (x: Controller<C>) => Controller<C>
  }) => Controller<C>[]
): Controller<C>[] => builder({createController: (controller) => controller})

export const createRoutes = <C extends ServerContext>(
  builder: (builders: {
    createRoute: typeof buildQuery<C>
    createModelRestEndpoints: <T extends HasId>(
      x: BuilderParams<C, T>
    ) => Route<C>[]
  }) => Route<C>[]
): Route<C>[] =>
  builder({
    createRoute: buildQuery,
    createModelRestEndpoints: (x) => modelRestEndpoints(x),
  })
