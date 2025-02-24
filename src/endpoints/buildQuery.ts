import {Parsable} from "../server/validation"
import {EndpointBuilderType, Route} from "../server/controller"
import {Controller, ServerContext} from "../server/simpleServer"
import {BuilderParams, HasId, modelRestEndpoints, ParseError} from "../server"

export type AuthOptions<C extends ServerContext> =
  | {type: "publicAccess"}
  | {type: "notAllowed"}
  | {type: "authenticated"}
  | {type: "customAuth"; check: (auth: C["auth"]) => boolean}

type Method = "get" | "put" | "post" | "delete"

type BodyBuilder<C extends ServerContext, Auth extends AuthOptions<C>> = <
  Body1
>(params: {
  validator: Parsable<Body1>
}) => {
  build: (params: EndpointBuilderType<C, Body1, Auth>) => Route<C, Body1, Auth>
}
type BuildType<C extends ServerContext, Body1, Auth extends AuthOptions<C>> = (
  params: EndpointBuilderType<C, Body1, Auth>
) => Route<C, Body1, Auth>

type Builder<C extends ServerContext> = {
  withAuth: <Auth extends AuthOptions<C>>(
    authOptions: Auth
  ) => {
    withBody: BodyBuilder<C, Auth>
    build: BuildType<C, unknown, Auth>
  }
  withBody: BodyBuilder<C, {type: "publicAccess"}>
  build: BuildType<C, unknown, {type: "publicAccess"}>
}

type BuildParams = {
  path: `/${string}`
  method: Method
}

function createBuilder<
  C extends ServerContext,
  Body1,
  Auth extends AuthOptions<C>
>(params: BuildParams & {authOptions: Auth}): BuildType<C, Body1, Auth> {
  return (builder) => ({
    authOptions: params.authOptions,
    method: params.method,
    path: params.path,
    fun: builder,
  })
}

function withBody<C extends ServerContext, Auth extends AuthOptions<C>>(
  params: BuildParams & {authOptions: AuthOptions<C>}
): BodyBuilder<C, Auth> {
  return (optionsParams) => ({
    build: (builder) => ({
      authOptions: params.authOptions,
      method: params.method,
      path: params.path,
      fun: (info) => {
        try {
          optionsParams.validator.parse(info.req.body)
        } catch (e: any) {
          if ("message" in e) {
            throw new ParseError(`Invalid request body: ${e.message}`)
          }
        }
        return builder(info)
      },
    }),
  })
}
export function buildQuery<C extends ServerContext>(
  params: BuildParams
): Builder<C> {
  return {
    withAuth: (authOptions) => ({
      withBody: withBody({...params, authOptions: authOptions}),
      build: createBuilder({...params, authOptions: authOptions}),
    }),
    withBody: withBody({...params, authOptions: {type: "publicAccess"}}),
    build: createBuilder({...params, authOptions: {type: "publicAccess"}}),
  }
}

// Functions for correct implicit typing when creating controllers
export const createControllers = <C extends ServerContext>(
  builder: (builders: {
    createController: (x: Controller<C>) => Controller<C>
  }) => Controller<C>[]
): Controller<C>[] => builder({createController: (c) => c})

export const createRoutes = <C extends ServerContext>(
  builder: (builders: {
    createRoute: typeof buildQuery<C>
    createModelRestEndpoints: <T extends HasId>(
      x: BuilderParams<C, T>
    ) => Route<C>[]
  }) => Route<C>[]
): Route<C, any, any>[] =>
  builder({
    createRoute: buildQuery,
    createModelRestEndpoints: modelRestEndpoints,
  })
