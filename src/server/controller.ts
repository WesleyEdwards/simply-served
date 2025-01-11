import express, {Express, Response, Request} from "express"

export type ServerInfo = {
  db: any
  auth?: any
}

export type EndpointBuilderType<C extends ServerInfo, Body> = (
  info: {
    req: Request<any, any, Body>
    res: Response
  } & C
) => Promise<Response<any, Record<string, any>>>

export type Route<C extends ServerInfo, Body = any> = {
  path: string
  method: "post" | "put" | "get" | "delete"
  endpointBuilder: EndpointBuilderType<C, Body>
  skipAuth?: boolean
}

export function controller<C extends ServerInfo>(
  basePath: string,
  routes: Route<C>[]
) {
  return (
    app: Express,
    client: (req: Request, skipAuth?: boolean) => C | null
  ) => {
    const router = express.Router()
    routes.forEach((route) => {
      router.use(route.path, async (req, res, next): Promise<any> => {
        const sameMethod = req.method.toLowerCase() === route.method
        if (!sameMethod) {
          return next()
        }
        const c = client(req, route.skipAuth)
        if (c === null) {
          return res.status(401).json({message: "Unauthorized"})
        } else {
          next()
        }
        return null
      })
      router[route.method](route.path, async (req, res, next): Promise<any> => {
        const c = client(req, route.skipAuth)
        if (c === null) {
          return next()
        }
        return route.endpointBuilder({req, res, ...c})
      })
    })
    app.use(`/${basePath}`, router)
  }
}
