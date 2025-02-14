import express, {Express, Response, Request} from "express"
import {Middleware, ServerContext} from "./simpleServer"
import {BuildQueryReturn} from "../endpoints"
import {OptionalAuth, When, WithoutAuth} from "../endpoints/types"
import {InternalServerError} from "./errorHandling"

export type EndpointBuilderType<
  C extends ServerContext,
  Body,
  SkipAuth extends boolean
> = (
  info: {
    req: Request<any, any, Body>
    res: Response
  } & When<SkipAuth, OptionalAuth<C>, C>
) => Promise<Response<any, Record<string, any>>>

export type Route<
  C extends ServerContext = ServerContext,
  Body = any,
  SkipAuth extends boolean = true | false
> = {
  path: string
  method: "post" | "put" | "get" | "delete"
  endpointBuilder: BuildQueryReturn<C, Body, SkipAuth>
}

export function controller<C extends ServerContext>(
  basePath: string,
  routes: Route<C>[]
) {
  return (app: Express, initCxt: WithoutAuth<C>, middleware: Middleware<C>) => {
    const router = express.Router()
    routes.forEach((route) => {
      const endpointBuilder = route.endpointBuilder
      router.use(route.path, async (req, res, next): Promise<any> => {
        const sameMethod = req.method.toLowerCase() === route.method
        if (!sameMethod) {
          return next()
        }
        const c = middleware(req, initCxt, endpointBuilder.authOptions)
        if (c === null) {
          console.log("Unauth")
          return res.status(401).json({message: "Unauthorized"})
        } else {
          next()
        }
        return null
      })
      router[route.method](route.path, async (req, res, next): Promise<any> => {
        const c: any = middleware(req, initCxt, endpointBuilder.authOptions)
        if (c === null) {
          return next()
        }
        return endpointBuilder.fun({req, res, ...c})
      })
      router.use((err: any, _req: Request, res: Response, _next: any) => {
        if (err.status) {
          res.status(err.status).send(err.message)
        } else {
          res.status(500).send(new InternalServerError().message)
        }
        console.error(err.stack)
      })
    })
    app.use(`/${basePath}`, router)
  }
}
