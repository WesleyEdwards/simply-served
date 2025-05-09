import express, {Request} from "express"
import {Route} from "./server"

export type Method = "get" | "put" | "post" | "delete"

export type ExpressType = ReturnType<typeof express>

export type ServerContext = {
  db: any
  auth: any
}

export type SimpleMiddleware<Ctx extends ServerContext> = (
  req: Request
) => NonNullable<Ctx["auth"]> | undefined

export type Controller<Ctx extends ServerContext> = {
  path: `/${string}`
  routes: Route<Ctx, any, any>[]
}

export type WithoutAuth<Ctx extends ServerContext> = Omit<Ctx, "auth">
