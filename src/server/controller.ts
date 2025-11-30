import express, {Express, Response, Request} from "express"
import {AuthPath, Path} from "../endpoints"
import {Method, RequestWithAuth, RequestWithCtx, ServerContext} from "../types"
import {UnauthorizedError} from "./errorHandling"
import {MetaInfo} from "../meta"

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
  _meta?: MetaInfo
}

type ControllerDef<C extends ServerContext> = {
  path: `/${string}`
  routes: Record<string, Route<C>>
}

export function addController<C extends ServerContext>(
  app: Express,
  controllerDef: ControllerDef<C>
) {
  const {routes, path: basePath} = controllerDef
  const routesList = Object.values(routes)

  const router = express.Router()

  routesList.forEach((route) => {
    const {authPath: authOptions, method, fun} = route
    const path = authOptions.path

    // Collect Metadata
    if (route._meta) {
      // console.log("META: ", route.authPath)
      const meta = route._meta
      if (meta.type === "endpoint") {
        meta.name = path.route
        meta.group = basePath.replace(/^\//, "")
        // Extract args from path
        const args: Record<string, string> = {}
        if (path.type === "id") {
          const nameOfId = path.route.split(":").at(1)
          if (nameOfId) {
            args[nameOfId] = "string"
          }
        }
        meta.args = args

        // Add to app metadata
        const a = app as Express & {_meta?: MetaInfo[]}
        if (!a._meta) {
          a._meta = []
        }
        a._meta.push(meta)
      }
    } else {
      // console.log("NO META: ", route.authPath)
    }

    router.use(path.route, async (req, _, next): Promise<any> => {
      const sameMethod = req.method.toLowerCase() === method
      if (!sameMethod) {
        return next()
      }
      verifyAuth(req, authOptions)
      next()
    })

    router[method](path.route, async (req, res): Promise<any> => {
      let ids: Record<string, string> = {}
      if (path.type === "id") {
        const p = req.params as any
        const nameOfId = path.route.split(":").at(1)
        if (!nameOfId) {
          throw new Error(`Expected ${nameOfId} but found none`)
        }
        if (authOptions.type === "customAuth") {
          const nameOfId = authOptions.path.route.split(":").at(1)
          if (!nameOfId) {
            throw new Error("Id not found")
          }
          const auth = (req as any).auth
          if (!authOptions.check(auth, ids)) {
            throw new UnauthorizedError()
          }
        }
        ids = p
      }

      const r = req as RequestWithAuth<C>
      return fun(r, res, r.auth, ids)
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
  // checked later on
  if (authOptions.type === "customAuth") {
    return
  }
  
  throw new UnauthorizedError()
}
