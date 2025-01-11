import {SInfo, Route, controller} from "./controller"
import express, {Request} from "express"

export type ExpressType = ReturnType<typeof express>

export abstract class SimplyServer<C extends SInfo> {
  abstract db: C["db"]
  controllers: {[K in string]: Route<C>[]} = {}

  middleware: (req: Request, skipAuth?: boolean) => C | null = () => null

  endpoints: (app: ExpressType) => ExpressType = (a) => a

  generateEndpoints = (app: ExpressType) => {
    for (const [path, routes] of Object.entries(this.controllers)) {
      controller(path, routes)(app, this.middleware)
    }
    this.endpoints(app)
    return app
  }
}
