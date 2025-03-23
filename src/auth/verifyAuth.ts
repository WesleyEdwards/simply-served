import {ServerContext, SimpleMiddleware} from "types"
import {UnauthorizedError} from "../server"
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
 * @returns A middleware function that verifies auth based on basic Bearer Auth
 */
export function bearerTokenAuth<Ctx extends ServerContext>(
  encryptionKey: string
): SimpleMiddleware<Ctx> {
  return (req) => {
    const token = req.headers.authorization?.split(" ")?.at(1)
    if (token) {
      const auth = getJwtBody(token, encryptionKey) as Ctx["auth"] | null
      if (!auth) {
        throw new UnauthorizedError()
      }
      return auth
    }
    return undefined
  }
}
