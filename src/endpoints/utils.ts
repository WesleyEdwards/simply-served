import {
  BuilderParams,
  buildQuery,
  Controller,
  HasId,
  modelRestEndpoints,
  Route,
  ServerContext,
} from "../"

/**
 * Utility function to improve implicit typing for constructing controllers
 */
export const createControllers = <C extends ServerContext>(
  builder: (builders: {
    createController: (x: Controller<C>) => Controller<C>
  }) => Controller<C>[]
): Controller<C>[] => builder({createController: (c) => c})

/**
 * Utility function to improve implicit typing for constructing routes within a controller
 */
export const createRoutes = <C extends ServerContext>(
  builder: (builders: {
    createRoute: typeof buildQuery<C>
    createModelRestEndpoints: <T extends HasId>(
      x: BuilderParams<C, T>
    ) => Route<C>[]
  }) => Route<C>[]
): Route<C, any, any>[] =>
  builder({
    createRoute: buildQuery,
    createModelRestEndpoints: modelRestEndpoints,
  })
