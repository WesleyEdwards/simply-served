import {evalCondition} from "../condition"
import {Middleware, ServerContext} from "../server"
import jwt from "jsonwebtoken"

const getJwtBody = (token: string, encryptionKey: string) => {
  try {
    const jwtBody = jwt.verify(token || "", encryptionKey)
    if (typeof jwtBody !== "object" || jwtBody === null) {
      return null
    }
    return jwtBody
  } catch (e) {
    return null
  }
}

/**
 * @param encryptionKey
 * @returns A function that will return the clients with the auth field set to the jwt payload if the jwt is valid
 */
export function verifyAuth<Ctx extends ServerContext>(encryptionKey: string) {
  const fun: Middleware<Ctx> = (req, clients, authOptions) => {
    const token = req.headers.authorization?.split(" ")?.at(1)
    if (token) {
      const auth = getJwtBody(token, encryptionKey) as Ctx["auth"] | null
      if (!auth) {
        return null
      }

      if (authOptions === undefined) {
        return {...clients, auth} as Ctx
      }

      if ("auth" in authOptions) {
        const condition = authOptions.auth(auth)
        if (evalCondition(auth, condition)) {
          return {...clients, auth} as Ctx
        }
      }
    }

    if (!!authOptions && "skipAuth" in authOptions) {
      return {...clients, auth: undefined} as Ctx
    } else {
      return null
    }
  }
  return fun
}
