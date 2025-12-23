import {ServerContext, WithoutAuth} from "../types"
import {UnauthorizedError} from "../server"
import jwt from "jsonwebtoken"
import express from "express"

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
 * Stores the auth in the params dict as simplyAuth: Ctx
 */
export const bearerTokenMiddleware =
  (encryptionKey: string) =>
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const token = req.headers.authorization?.split(" ")?.at(1)

    if (token) {
      const auth = getJwtBody(token, encryptionKey) as
        | ServerContext["auth"]
        | null
      ;(req as any).auth = auth

      if (!auth) {
        throw new UnauthorizedError()
      }
    }

    next()
  }

export const addContext =
  <C extends ServerContext>(ctx: WithoutAuth<C>) =>
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    for (const [key, value] of Object.entries(ctx)) {
      ;(req as any)[key] = value
    }
    next()
  }
