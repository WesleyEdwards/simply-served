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

type BodyBuilder<
  C extends ServerContext,
  P extends Path,
  Auth extends AuthOptions<C>
> = <Body1>(params: {validator: Parsable<Body1>}) => {
  build: (
    params: EndpointBuilderType<C, P, Body1, Auth>
  ) => Route<C, P, Body1, Auth>
}

type BuildType<
  C extends ServerContext,
  P extends Path,
  Body1,
  Auth extends AuthOptions<C>
> = (params: EndpointBuilderType<C, P, Body1, Auth>) => Route<C, P, Body1, Auth>

type BodyAndBuild<
  C extends ServerContext,
  P extends Path,
  Auth extends AuthOptions<C>
> = {
  withBody: BodyBuilder<C, P, Auth>
  build: BuildType<C, P, unknown, Auth>
}

type NewType1<C extends ServerContext, P extends Path> = {
  withAuth: <Auth extends AuthOptions<C>>(
    authOptions: Auth
  ) => BodyAndBuild<C, P, Auth>
  withBody: BodyBuilder<C, P, {type: "publicAccess"}>
  build: BuildType<C, P, unknown, {type: "publicAccess"}>
}

type Builder<C extends ServerContext> = {
  path: (
    route: `/${string}`
  ) => NewType1<C, {type: "route"; route: `/${string}`}>

  idPath: (
    //default: "/:id"
    route?: `/${string}:id`
  ) => NewType1<C, {type: "id"; route: `/${string}:id`}>
}

export type Path =
  | {type: "id"; route: `/${string}:id`}
  | {type: "route"; route: `/${string}`}

function createBuilder<
  C extends ServerContext,
  P extends Path,
  Body1,
  Auth extends AuthOptions<C>
>(params: {
  method: Method
  authOptions: Auth
  path: P
}): BuildType<C, P, Body1, Auth> {
  return (builder) => ({
    authOptions: params.authOptions,
    method: params.method,
    path: params.path,
    fun: builder,
  })
}

function withBody<
  C extends ServerContext,
  P extends Path,
  Auth extends AuthOptions<C>
>(params: {
  method: Method
  authOptions: AuthOptions<C>
  path: P
}): BodyBuilder<C, P, Auth> {
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
        return builder(info) // todo
      },
    }),
  })
}

export function buildQuery<C extends ServerContext>(
  method: Method
): Builder<C> {
  return {
    path: (params1) => ({
      withAuth: (authOptions) => ({
        withBody: withBody({
          method: method,
          path: {type: "route", route: params1},
          authOptions: authOptions,
        }),
        build: createBuilder({
          method: method,
          path: {type: "route", route: params1},
          authOptions: authOptions,
        }),
      }),
      withBody: withBody({
        method,
        path: {type: "route", route: params1},
        authOptions: {type: "publicAccess"},
      }),
      build: createBuilder({
        method,
        path: {type: "route", route: params1},
        authOptions: {type: "publicAccess"},
      }),
    }),
    idPath: (route) => ({
      withAuth: (authOptions) => ({
        withBody: withBody({
          method,
          path: {type: "id", route: route ?? "/:id"},
          authOptions: authOptions,
        }),
        build: createBuilder({
          method,
          path: {type: "id", route: route ?? "/:id"},
          authOptions: authOptions,
        }),
      }),
      withBody: withBody({
        method,
        path: {type: "id", route: route ?? "/:id"},
        authOptions: {type: "publicAccess"},
      }),
      build: createBuilder({
        method,
        path: {type: "id", route: route ?? "/:id"},
        authOptions: {type: "publicAccess"},
      }),
    }),
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
