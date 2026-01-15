import {ServerContext} from "../types"
import {buildRoute} from "../"
import {Route} from "../server"

/**
 * Utility function to improve implicit typing for constructing routes within a controller
 */
export const createRoutes = <C extends ServerContext>(
  builder: (builders: {
    buildRoute: typeof buildRoute<C>
  }) => Record<string, Route<C>>
): Record<string, Route<C>> => builder({buildRoute})
