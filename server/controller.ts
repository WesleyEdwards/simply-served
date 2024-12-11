import express, {Express, Response, Request, NextFunction} from "express"
import {Clients} from "../../controllers/appClients"

export type RequestWithJWTBody<Body, C extends SClient, Auth> = Request<
  any,
  any,
  Body
> &
  Auth &
  C

export type AuthReqHandler<Body, C extends SClient, Auth> = (
  req: RequestWithJWTBody<Body, C, Auth>,
  res: Response,
  next: NextFunction
) => void

export type ReqBuilder<Body, C extends SClient, Auth> = (
  clients: Clients
) => AuthReqHandler<Body, C, Auth>

export type SClient = {
  db: any
}

export type EndpointBuilderType<Body, C extends SClient, Auth> = (
  info: {
    req: RequestWithJWTBody<Body, C, Auth>
    res: Response
  } & C
) => Promise<Response<any, Record<string, any>>>

export type Route<Body, C extends SClient, Auth> = {
  path: string
  method: "post" | "put" | "get" | "delete"
  endpointBuilder: EndpointBuilderType<Body, C, Auth>
  skipAuth?: boolean
}

export function controller<C extends SClient, Auth>(
  name: string,
  routes: Route<any, C, Auth>[],
  middleware?: AuthReqHandler<Body, C, Auth>
) {
  return (app: Express, client: C) => {
    const router = express.Router()
    routes.forEach((route) => {
      if (!route.skipAuth) {
        router.use(route.path, (req, res, next) => {
          if (req.method.toLowerCase() === route.method) {
            middleware?.(req as any, res, next)
          } else {
            next()
          }
        })
      }
      router[route.method](route.path, (req, res) =>
        route.endpointBuilder({...client, req: req, res} as any)
      )
    })
    app.use(`/${name}`, router)
  }
}
