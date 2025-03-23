import express, {Express, Response, Request} from "express"
import {Middleware, ServerContext} from "./simpleServer"
import {AuthPath, Path} from "../endpoints"
import {OptionalAuth, When, WithoutAuth} from "../endpoints/types"

export type EndpointBuilderType<
  C extends ServerContext,
  P extends Path,
  Body,
  A extends AuthPath<C, P> | undefined
> = (
  info: {
    req: Request<any, any, Body>
    body: Body
    res: Response
  } & When<DisableAuth<C, P, A>, OptionalAuth<C>, C> &
    IdObjFromPath<P>
) => Promise<Response<any, Record<string, any>>>

export type IdObjFromPath<P extends Path> = {
  [idName in P["route"] extends `${string}:${infer H}` ? H : never]: string
}

export type Route<
  C extends ServerContext = ServerContext,
  P extends Path = Path,
  Body = any,
  A extends AuthPath<C, P> = any
> = {
  fun: EndpointBuilderType<C, P, Body, A>
  authPath: AuthPath<C, P>
  method: "post" | "put" | "get" | "delete"
}

export function controller<C extends ServerContext>(
  basePath: `/${string}`,
  routes: Route<C>[]
) {
  return (app: Express, initCxt: WithoutAuth<C>, middleware: Middleware<C>) => {
    const router = express.Router()
    routes.forEach((route) => {
      const {authPath: authOptions, method, fun} = route
      const p = authOptions.path.route

      router.use(p, async (req, res, next): Promise<any> => {
        const sameMethod = req.method.toLowerCase() === method
        if (!sameMethod) {
          return next()
        }
        const c = middleware(req, initCxt, authOptions)
        if (c === null) {
          return res.status(401).json({message: "Unauthorized"})
        } else {
          next()
        }
        return null
      })

      router[method](p, async (req, res, next): Promise<any> => {
        const c: any = middleware(req, initCxt, authOptions)
        if (c === null) {
          return next()
        }
        if (authOptions.path.type === "id") {
          const p = req.params as any
          const nameOfId = authOptions.path.route.split(":").at(1)
          if (!nameOfId) {
            throw new Error("Id not found")
          }
          return fun({[nameOfId]: p[nameOfId], req, res, body: req.body, ...c})
        } else {
          return fun({req, res, body: req.body, ...c})
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

type DisableAuth<
  C extends ServerContext,
  P extends Path,
  A extends AuthPath<C, P> | undefined
> = A extends undefined ? true : A extends {type: "publicAccess"} ? true : false
