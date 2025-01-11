import {checkValidSchema, isValid, SafeParsable} from "./validation"
import {EndpointBuilderType} from "./controller"
import {ServerContext} from "./simpleServer"

export function buildQuery<C extends ServerContext, T = any>(params: {
  validator?: SafeParsable<T>
  fun: EndpointBuilderType<C, T>
}) {
  const intermediate: EndpointBuilderType<C, T> = async (info) => {
    if (params.validator) {
      const valid = checkValidSchema(info.req.body, params.validator)
      if (!isValid(valid)) {
        return info.res.status(400).json({error: valid})
      }
    }

    return params.fun(info)
  }

  return intermediate
}
