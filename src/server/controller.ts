import express, {Express, Response, Request} from "express"
import {AuthPath, Path} from "../endpoints"
import {Method, WithoutAuth, ServerContext, SimpleMiddleware} from "../types"
import {UnauthorizedError} from "./errorHandling"

export type EndpointBuilderType<
  C extends ServerContext,
  P extends Path,
  Body,
  A extends AuthPath<C, P>
> = (
  info: {
    req: Request<any, any, Body>
    body: Body
    res: Response
  } & IdObjFromPath<P> &
    Omit<C, "auth">,
  auth: A extends {type: "publicAccess"} ? C["auth"] | undefined : C["auth"]
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

export function controller<C extends ServerContext>(
  basePath: `/${string}`,
  routes: Route<C>[]
) {
  return (
    app: Express,
    initCxt: WithoutAuth<C>,
    getAuth: SimpleMiddleware<C>
  ) => {
    const router = express.Router()
    routes.forEach((route) => {
      const {authPath: authOptions, method, fun} = route
      const p = authOptions.path.route

      router.use(p, async (req, _, next): Promise<any> => {
        const sameMethod = req.method.toLowerCase() === method
        if (!sameMethod) {
          return next()
        }
        verifyAuth(req, initCxt, authOptions, getAuth)
        next()
      })

      router[method](p, async (req, res): Promise<any> => {
        const {auth, ...rest} = verifyAuth(req, initCxt, authOptions, getAuth)
        if (authOptions.path.type === "id") {
          const p = req.params as any
          const nameOfId = authOptions.path.route.split(":").at(1)
          if (!nameOfId) {
            throw new Error("Id not found")
          }
          return (fun as any)(
            {
              [nameOfId]: p[nameOfId],
              req,
              res,
              body: req.body,
              ...rest,
            },
            auth
          )
        } else {
          return (fun as any)({req, res, body: req.body, ...rest}, auth)
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
  clients: WithoutAuth<Ctx>,
  authOptions: AuthPath<Ctx, any>,
  getAuth: (req: Request) => NonNullable<Ctx["auth"]> | undefined
): Ctx {
  const auth = getAuth(req)
  if (auth) {
    if (
      authOptions.type === "publicAccess" ||
      authOptions.type === "authenticated"
    ) {
      return {...clients, auth} as Ctx
    }

    if (authOptions.type === "customAuth") {
      const nameOfId = authOptions.path.route.split(":").at(1)
      if (!nameOfId) {
        throw new Error("Id not found")
      }
      if (authOptions.check(auth, {[nameOfId]: req.params[nameOfId]})) {
        return {...clients, auth} as Ctx
      }
    }
  }

  if (authOptions.type === "publicAccess") {
    return {...clients, auth: undefined} as Ctx
  }
  throw new UnauthorizedError()
}
