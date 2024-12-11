import {checkValidSchema, isValid, SafeParsable} from "../validation"
import {EndpointBuilderType, SClient} from "./controller"

export function buildQuery<T, C extends SClient>(params: {
  validator?: SafeParsable<T>
  fun: EndpointBuilderType<T, C, any>
}) {
  const intermediate: EndpointBuilderType<T, C, any> = async (info) => {
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
