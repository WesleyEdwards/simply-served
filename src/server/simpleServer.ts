import {AuthPath} from "../endpoints"
import {Route, controller} from "./controller"
import express, {Request} from "express"
import {WithoutAuth} from "../endpoints/types"

export type ExpressType = ReturnType<typeof express>

export type ServerContext = {
  db: any
  auth: any
}

export type Middleware<C extends ServerContext> = (
  req: Request,
  initCtx: WithoutAuth<C>,
  authOptions: AuthPath<C, any>
) => C

export type Controller<C extends ServerContext> = {
  path: `/${string}`
  routes: Route<C, any, any>[]
}

export type SimplyServerConfig<C extends ServerContext> = {
  initContext: WithoutAuth<C>
  middleware: Middleware<C>
  controllers?: Controller<C>[]
  beforeGenerateEndpoints?: (app: ExpressType, context: WithoutAuth<C>) => void
  afterGenerateEndpoints?: (app: ExpressType, context: WithoutAuth<C>) => void
}

export const createSimplyServer = <Cxt extends ServerContext>(
  config: SimplyServerConfig<Cxt>
) => {
  const {
    initContext,
    middleware,
    controllers = [],
    beforeGenerateEndpoints = () => null,
    afterGenerateEndpoints = () => null,
  } = config

  let registeredControllers = [...controllers]

  const setController = (path: `/${string}`, routes: Route<Cxt>[]): void => {
    registeredControllers.push({path, routes})
  }

  const generateEndpoints = (app: ExpressType): ExpressType => {
    beforeGenerateEndpoints(app, initContext)
    for (const {path, routes} of controllers) {
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
    generateEndpoints,
  }
}
