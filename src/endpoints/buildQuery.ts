import {Parsable} from "../server/validation"
import {EndpointBuilderType, Route} from "../server/controller"
import {Controller, ServerContext} from "../server/simpleServer"
import {BuilderParams, HasId, modelRestEndpoints, ParseError} from "../server"

export type AuthOptions<C extends ServerContext> =
  | {type: "publicAccess"}
  | {type: "notAllowed"}
  | {type: "authenticated"}
  | {type: "customAuth"; check: (auth: C["auth"]) => boolean}

type BodyOptions1<C extends ServerContext> = <
  Auth extends AuthOptions<C>,
  Body1
>(params: {
  validator: Parsable<Body1>
}) => {
  build: (params: EndpointBuilderType<C, Body1, Auth>) => Route<C, Body1, Auth>
}

type BuildType<C extends ServerContext, Body1, Auth extends AuthOptions<C>> = (
  params: EndpointBuilderType<C, Body1, Auth>
) => Route<C, Body1, Auth>

type Method = "get" | "put" | "post" | "delete"

function withBody<C extends ServerContext>(
  params: BuildParams & {authOptions: AuthOptions<C>}
): BodyOptions1<C> {
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

type Builder<C extends ServerContext> = {
  withAuth: <Auth extends AuthOptions<C>>(
    authOptions: Auth
  ) => {
    withBody: BodyOptions1<C>
    build: BuildType<C, unknown, Auth>
  }
  withBody: <Body1>(params: {validator: Parsable<Body1>}) => {
    build: BuildType<C, Body1, {type: "publicAccess"}>
  }
  build: BuildType<C, unknown, {type: "publicAccess"}>
}

type BuildParams = {
  path: `/${string}`
  method: Method
}

const createBuilder =
  <C extends ServerContext, Body1, Auth extends AuthOptions<C>>(
    params: BuildParams & {authOptions: Auth}
  ): BuildType<C, Body1, Auth> =>
  (builder) => ({
    authOptions: params.authOptions,
    method: params.method,
    path: params.path,
    fun: builder,
  })

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
): Controller<C>[] => builder({createController: (controller) => controller})

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
    createModelRestEndpoints: (x) => modelRestEndpoints(x),
  })
