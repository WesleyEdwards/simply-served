import {Parsable} from "../server/validation"
import {EndpointBuilderType, IdObjFromPath, Route} from "../server/controller"
import {ParseError} from "../server"
import {Method, ServerContext} from "../types"

export type AuthPath<C extends ServerContext, P extends Path> =
  | {type: "publicAccess"; path: P}
  | {type: "authenticated"; path: P}
  | {type: "notAllowed"; path: P}
  | {
      type: "customAuth"
      check: (auth: C["auth"], ids: IdObjFromPath<P>) => boolean
      path: P
    }

type BodyBuilder<
  C extends ServerContext,
  P extends Path,
  Auth extends AuthPath<C, P>
> = <Body1>(params: {validator: Parsable<Body1>}) => {
  build: (
    params: EndpointBuilderType<C, P, Body1, Auth>
  ) => Route<C, P, Body1, Auth>
}

type BuildType<
  C extends ServerContext,
  P extends Path,
  Body1,
  Auth extends AuthPath<C, P>
> = (params: EndpointBuilderType<C, P, Body1, Auth>) => Route<C, P, Body1, Auth>

type BodyAndBuild<
  C extends ServerContext,
  P extends Path,
  Auth extends AuthPath<C, P>
> = {
  withBody: BodyBuilder<C, P, Auth>
  build: BuildType<C, P, unknown, Auth>
}

type NewType1<C extends ServerContext, P extends Path> = {
  withAuth: () => BodyAndBuild<C, P, {type: "authenticated"; path: P}>
  withCustomAuth: (
    check: (auth: C["auth"], ids: IdObjFromPath<P>) => boolean
  ) => BodyAndBuild<
    C,
    P,
    {
      type: "customAuth"
      check: (auth: C["auth"], ids: IdObjFromPath<P>) => boolean
      path: P
    }
  >
  withBody: BodyBuilder<C, P, {type: "publicAccess"; path: P}>
  build: BuildType<C, P, unknown, {type: "publicAccess"; path: P}>
}

type Builder<C extends ServerContext> = {
  path: (
    route: `/${string}`
  ) => NewType1<C, {type: "route"; route: `/${string}`}>

  idPath: <I extends `/${string}:${string}`>(
    route: I
  ) => NewType1<C, {type: "id"; route: I}>
}

export type Path =
  | {type: "id"; route: `/${string}:${string}`}
  | {type: "route"; route: `/${string}`}

/**
 * Builds a type-safe route using the builder pattern.
 *
 * The following are defined:
 * - Method: The HTTP method for the route ("get", "post", "put", "delete").
 * - path: Either a route or an id path.
 * - Auth: The authentication type for the route, which can be "publicAccess", "authenticated", or "customAuth".
 * - Body: The body type for the route (if any), which is parsed using a validator.
 * - Build: Define logic/operations that the route performs, assuming the request has met the auth requirements.
 */
export function buildRoute<C extends ServerContext>(
  method: Method
): Builder<C> {
  return {
    path: (route) => ({
      withAuth: () => ({
        withBody: withBody({
          method: method,
          authOptions: {
            type: "authenticated",
            path: {type: "route", route},
          },
        }),
        build: createBuilder({
          method: method,
          authPath: {
            type: "authenticated",
            path: {type: "route", route},
          },
        }),
      }),
      withCustomAuth: (check) => ({
        withBody: withBody({
          method: method,
          authOptions: {
            type: "customAuth",
            check,
            path: {type: "route", route},
          },
        }),
        build: createBuilder({
          authPath: {
            type: "customAuth",
            check,
            path: {type: "route", route},
          },
          method: method,
        }),
      }),
      withBody: withBody({
        method,
        authOptions: {
          type: "publicAccess",
          path: {type: "route", route},
        },
      }),
      build: createBuilder({
        method,
        authPath: {
          type: "publicAccess",
          path: {type: "route", route},
        },
      }),
    }),
    idPath: (idRoute) => ({
      withAuth: () => ({
        withBody: withBody({
          method,
          authOptions: {
            type: "authenticated",
            path: {type: "id", route: idRoute},
          },
        }),
        build: createBuilder({
          method,
          authPath: {type: "authenticated", path: {type: "id", route: idRoute}},
        }),
      }),
      withCustomAuth: (check) => ({
        withBody: withBody({
          method,
          authOptions: {
            type: "customAuth",
            check,
            path: {type: "id", route: idRoute},
          },
        }),
        build: createBuilder({
          method,
          authPath: {
            type: "customAuth",
            check,
            path: {type: "id", route: idRoute},
          },
        }),
      }),
      withBody: withBody({
        method,
        authOptions: {type: "publicAccess", path: {type: "id", route: idRoute}},
      }),
      build: createBuilder({
        method,
        authPath: {type: "publicAccess", path: {type: "id", route: idRoute}},
      }),
    }),
  }
}

// ===================================
// Helper functions for For constructing Builders
// ===================================
function createBuilder<
  C extends ServerContext,
  P extends Path,
  Body1,
  Auth extends AuthPath<C, P>
>(params: {method: Method; authPath: Auth}): BuildType<C, P, Body1, Auth> {
  return (builder) => ({
    authPath: params.authPath,
    method: params.method,
    fun: builder,
  })
}

function withBody<
  C extends ServerContext,
  P extends Path,
  Auth extends AuthPath<C, P>
>(params: {
  method: Method
  authOptions: AuthPath<C, P>
}): BodyBuilder<C, P, Auth> {
  return (optionsParams) => ({
    build: (builder) => ({
      authPath: params.authOptions,
      method: params.method,
      fun: (info, auth) => {
        try {
          optionsParams.validator.parse(info.req.body)
        } catch (e: any) {
          if ("message" in e) {
            throw new ParseError(`Invalid request body: ${e.message}`)
          }
        }
        return builder(info, auth) // todo
      },
    }),
  })
}

export function buildRouteRaw<
  C extends ServerContext,
  P extends Path,
  Auth extends AuthPath<C, P>
>(params: {
  route: Route<C, P, any, Auth>
  validator?: Parsable<any>
}): Route<C, P, any, Auth> {
  const {route, validator} = params
  const {authPath, method, fun} = route
  if (validator) {
    return withBody({
      method,
      authOptions: authPath,
    })({validator}).build(fun)
  }
  return route
}
