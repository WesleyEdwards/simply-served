import express, {Request} from "express"
import {Route} from "./server"

export type Method = "get" | "put" | "post" | "delete"

export type ExpressType = ReturnType<typeof express>

export interface ServerContext {
  db: unknown
  auth: unknown
}

export type GetAuthFromRequest<Ctx extends ServerContext> = (
  req: Request
) => NonNullable<Ctx["auth"]> | undefined

export type Controller<Ctx extends ServerContext> = {
  path: `/${string}`
  routes: Route<Ctx, any, any>[]
}

export type WithoutAuth<Ctx extends ServerContext> = Omit<Ctx, "auth">

export type RequestWithAuth<C extends ServerContext> = express.Request & {
  auth: C["auth"]
}

export type RequestWithCtx<C extends ServerContext, Body = any> = express.Request<
  any,
  any,
  Body
> &
  WithoutAuth<C>
