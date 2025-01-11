import {Route, controller} from "./controller"
import express, {Request} from "express"

export type ExpressType = ReturnType<typeof express>

export type ServerContext = {
  db: any
  auth?: any
}

export type SimplyServerConfig<C extends ServerContext> = {
  initContext: C
  middleware?: (req: Request, initCtx: C, skipAuth?: boolean) => C | null
  controllers?: Record<string, Route<C>[]>
  beforeGenerateEndpoints?: (app: ExpressType, context: C) => void
  afterGenerateEndpoints?: (app: ExpressType, context: C) => void
}

export const createSimplyServer = <Cxt extends ServerContext>(
  config: SimplyServerConfig<Cxt>
) => {
  const {
    initContext,
    middleware = () => null,
    controllers = {},
    beforeGenerateEndpoints = () => null,
    afterGenerateEndpoints = () => null
  } = config

  let registeredControllers = {...controllers}

  const setController = (path: string, routes: Route<Cxt>[]): void => {
    registeredControllers[path] = routes
  }

  const generateEndpoints = (app: ExpressType): ExpressType => {
    beforeGenerateEndpoints(app, initContext)
    for (const [path, routes] of Object.entries(controllers)) {
      controller(path, routes)(app, initContext, middleware)
    }

    afterGenerateEndpoints(app, initContext)

    return app
  }

  return {
    initContext,
    middleware,
    setController,
    controllers,
    generateEndpoints
  }
}
