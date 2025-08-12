import express, {Express, Response, Request} from "express"
import {AuthPath, Path} from "../endpoints"
import {Method, RequestWithCtx, ServerContext} from "../types"
import {UnauthorizedError} from "./errorHandling"

export type EndpointBuilderType<
  C extends ServerContext,
  P extends Path,
  Body,
  A extends AuthPath<C, P>
> = (
  req: RequestWithCtx<C, Body>,
  res: Response,
  auth: A extends {type: "publicAccess"} ? C["auth"] | undefined : C["auth"],
  ids: IdObjFromPath<P>
) => Promise<Response<any, Record<string, any>>>

export type IdObjFromPath<P extends Path> = {
  [idName in P["route"] extends `${string}:${infer H}` ? H : never]: string
}

export type Route<
  C extends ServerContext = ServerContext,
  P extends Path = Path,
  Body = any,
  Auth extends AuthPath<C, P> = any
> = {
  fun: EndpointBuilderType<C, P, Body, Auth>
  authPath: AuthPath<C, P>
  method: Method
}

export function addController<C extends ServerContext>(
  app: Express,
  controllerDef: {
    path: `/${string}`
    routes: Route<C>[]
  }
) {
  controller(controllerDef.path, controllerDef.routes)(app)
}

export function controller<C extends ServerContext>(
  basePath: `/${string}`,
  routes: Route<C>[]
) {
  return (app: Express) => {
    const router = express.Router()
    routes.forEach((route) => {
      const {authPath: authOptions, method, fun} = route
      const path = authOptions.path

      router.use(path.route, async (req, _, next): Promise<any> => {
        const sameMethod = req.method.toLowerCase() === method
        if (!sameMethod) {
          return next()
        }
        verifyAuth(req, authOptions)
        next()
      })

      router[method](path.route, async (req, res): Promise<any> => {
        if (path.type === "id") {
          const p = req.params as any
          const nameOfId = path.route.split(":").at(1)
          if (!nameOfId) {
            throw new Error("Id not found")
          }
          if (authOptions.type === "customAuth") {
            const ids: Record<string, string> = {}
            const nameOfId = authOptions.path.route.split(":").at(1)
            if (!nameOfId) {
              throw new Error("Id not found")
            }
            const auth = (req as any).auth
            if (!authOptions.check(auth, ids)) {
              throw new UnauthorizedError()
            }
          }
          return fun(req as RequestWithCtx<C>, res, undefined, {
            [nameOfId]: p[nameOfId],
          })
        } else {
          const auth = (req as any).auth
          const re = req as RequestWithCtx<C>
          return fun(re, res, auth, {})
        }
      })
      router.use((err: any, _req: Request, res: Response, _next: any) => {
        if (err.status) {
          res.status(err.status).send(err.message)
        } else {
          res.status(500).send(err.message)
        }
      })
    })
    app.use(basePath, router)
  }
}

function verifyAuth<Ctx extends ServerContext>(
  req: Request,
  authOptions: AuthPath<Ctx, Path>
) {
  const auth = (req as any).auth
  if (auth) {
    if (
      authOptions.type === "publicAccess" ||
      authOptions.type === "authenticated"
    ) {
      return
    }
  }

  if (authOptions.type === "publicAccess") {
    return
  }

  throw new UnauthorizedError()
}
