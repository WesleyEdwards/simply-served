import {ServerInfo, Route, controller} from "./controller"
import express, {Request} from "express"

export type ExpressType = ReturnType<typeof express>

export type SimpleMiddleware<C extends ServerInfo> = (
  req: Request,
  skipAuth?: boolean
) => C | null

export abstract class SimplyServer<C extends ServerInfo> {
  middleware: SimpleMiddleware<C> = () => null

  controllers: Record<string, Route<C>[]> = {}

  constructor(params: {
    db: C["db"]
    middleware?: (req: Request, skipAuth?: boolean) => C | null
  }) {
    if (params.middleware) this.middleware = params.middleware
  }

  setController(path: string, routes: Route<C>[]): void {
    this.controllers[path] = routes
  }

  protected registerEndpoints(app: ExpressType): void {}

  protected beforeGenerateEndpoints(app: ExpressType): void {}

  protected afterGenerateEndpoints(app: ExpressType): void {}

  generateEndpoints = (app: ExpressType) => {
    this.beforeGenerateEndpoints(app)
    for (const [path, routes] of Object.entries(this.controllers)) {
      controller(path, routes)(app, this.middleware)
    }
    this.registerEndpoints(app)
    this.afterGenerateEndpoints(app)
    return app
  }
}
