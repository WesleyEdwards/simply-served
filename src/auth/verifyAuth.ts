import {Middleware, ServerContext, UnauthorizedError} from "../server"
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
        throw new UnauthorizedError()
      }

      if (
        authOptions.type === "publicAccess" ||
        authOptions.type === "authenticated"
      ) {
        return {...clients, auth} as Ctx
      }

      if (authOptions.type === "customAuth") {
        const nameOfId = authOptions.path.route.split(":").at(1)
        if (!nameOfId) {
          throw new Error("Id not found")
        }
        if (authOptions.check(auth, {[nameOfId]: req.params[nameOfId]})) {
          return {...clients, auth} as Ctx
        }
      }
    }

    if (!!authOptions && authOptions.type === "publicAccess") {
      return {...clients, auth: undefined} as Ctx
    } else {
      throw new UnauthorizedError()
    }
  }
  return fun
}
