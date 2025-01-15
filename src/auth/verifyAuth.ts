import {ServerContext} from "../server"
import {Request} from "express"
import jwt from "jsonwebtoken"

/**
 * @param encryptionKey
 * @returns A function that will return the clients with the auth field set to the jwt payload if the jwt is valid
 */
export function verifyAuth<Ctx extends ServerContext>(encryptionKey: string) {
  const fun = (req: Request, clients: Ctx, skipAuth?: boolean) => {
    const token = req.headers.authorization?.split(" ")?.at(1)
    if (token) {
      try {
        const jwtBody = jwt.verify(token || "", encryptionKey)
        if (typeof jwtBody !== "object" || jwtBody === null) {
          return null
        }
        return {...clients, auth: jwtBody}
      } catch (e) {
        return null
      }
    }

    if (skipAuth) {
      return {...clients, auth: undefined}
    } else {
      return null
    }
  }
  return fun
}
