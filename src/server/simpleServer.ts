import {
  ServerContext,
  WithoutAuth,
  Controller,
  ExpressType,
  SimpleMiddleware,
} from "../types"
import {Route, controller} from "./controller"

/**
 * 'initContext': Server context without auth
 * 'getAuth': Middleware for calculating auth for requests
 * 'controllers': Controller(s) included in server
 * 'beforeGenerateEndpoints': Provides access to Express App before generation of endpoints
 * 'afterGenerateEndpoints': Provides access to Express App after generation of endpoints
 */
export type SimplyServerConfig<C extends ServerContext> = {
  initContext: WithoutAuth<C>
  getAuth: SimpleMiddleware<C>
  controllers?: Controller<C>[]
  beforeGenerateEndpoints?: (app: ExpressType, context: WithoutAuth<C>) => void
  afterGenerateEndpoints?: (app: ExpressType, context: WithoutAuth<C>) => void
}

export const createSimplyServer = <Cxt extends ServerContext>(
  config: SimplyServerConfig<Cxt>
) => {
  const {
    initContext,
    getAuth,
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
      controller(path, routes)(app, initContext, getAuth)
    }

    afterGenerateEndpoints(app, initContext)

    return app
  }

  return {
    initContext,
    getAuth,
    setController,
    controllers,
    generateEndpoints,
  }
}
