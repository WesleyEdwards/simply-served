import express, {Express, Response, Request} from "express"
import {Middleware, ServerContext} from "./simpleServer"
import {AuthOptions} from "../endpoints"
import {OptionalAuth, When, WithoutAuth} from "../endpoints/types"
import {InternalServerError} from "./errorHandling"

export type EndpointBuilderType<
  C extends ServerContext,
  Body,
  A extends AuthOptions<C> | undefined
> = (
  info: {
    req: Request<any, any, Body>
    body: Body
    res: Response
  } & When<DisableAuth<A>, OptionalAuth<C>, C>
) => Promise<Response<any, Record<string, any>>>

export type Route<
  C extends ServerContext = ServerContext,
  Body = any,
  A extends AuthOptions<C> = any
> = {
  fun: EndpointBuilderType<C, Body, A>
  authOptions: AuthOptions<C>
  path: `/${string}`
  method: "post" | "put" | "get" | "delete"
}

export function controller<C extends ServerContext>(
  basePath: `/${string}`,
  routes: Route<C>[]
) {
  return (app: Express, initCxt: WithoutAuth<C>, middleware: Middleware<C>) => {
    const router = express.Router()
    routes.forEach((route) => {
      const {authOptions, method, fun, path} = route

      router.use(route.path, async (req, res, next): Promise<any> => {
        const sameMethod = req.method.toLowerCase() === route.method
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
      router[method](path, async (req, res, next): Promise<any> => {
        const c: any = middleware(req, initCxt, authOptions)
        if (c === null) {
          return next()
        }
        return fun({req, res, ...c})
      })
      router.use((err: any, _req: Request, res: Response, _next: any) => {
        if (err.status) {
          res.status(err.status).send(err.message)
        } else {
          res.status(500).send(new InternalServerError().message)
        }
      })
    })
    app.use(basePath, router)
  }
}

type DisableAuth<T extends AuthOptions<any> | undefined> = T extends undefined
  ? true
  : T extends {type: "publicAccess"}
  ? true
  : false
