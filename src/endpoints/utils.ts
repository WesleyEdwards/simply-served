import {ServerContext, Controller} from "../types"
import {BuilderParams, buildRoute, HasId, modelRestEndpoints, Route} from "../"

/**
 * Utility function to improve implicit typing for constructing controllers
 */
export const createControllers = <C extends ServerContext>(
  builder: (builders: {
    createController: typeof createController
  }) => Controller<C>[]
): Controller<C>[] => builder({createController: (c) => c})

export const createController = <C extends ServerContext>(x: Controller<C>) => x

/**
 * Utility function to improve implicit typing for constructing routes within a controller
 */
export const createRoutes = <C extends ServerContext>(
  builder: (builders: {
    createRoute: typeof buildRoute<C>
    createModelRestEndpoints: <T extends HasId>(
      x: BuilderParams<C, T>
    ) => Route<C>[]
  }) => Route<C>[]
): Route<C, any, any>[] =>
  builder({
    createRoute: buildRoute,
    createModelRestEndpoints: modelRestEndpoints,
  })
