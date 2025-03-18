import {z} from "zod"
import express from "express"
import {
  buildQuery,
  createControllers,
  createRoutes,
  createSimplyServer,
  verifyAuth,
} from "../../src"
import todoDb from "./database"
import {TodoDb} from "./types"

export type MockCtx = {
  db: TodoDb
  auth: {
    userId: string
  }
}

export const getMockServer = () => {
  const mockApp = express()
  mockApp.use(express.json())

  const server = createSimplyServer<MockCtx>({
    initContext: {db: todoDb},
    middleware: verifyAuth("supersecretencryptionkey"),
    controllers: createControllers(({createController}) => [
      createController({
        path: "/todo",
        routes: createRoutes(({createModelRestEndpoints}) => [
          ...createModelRestEndpoints({
            collection: (db) => db.todo,
            validator: z.object({
              _id: z.string().uuid(),
              todoItem: z.string(),
              owner: z.string().uuid(),
              done: z.boolean().default(true),
            }),
            permissions: {
              read: {type: "publicAccess"},
              create: {type: "publicAccess"},
              modify: {type: "publicAccess"},
              delete: {
                type: "modelAuth",
                check: (auth) => ({owner: {Equal: auth.userId}}),
              },
            },
          }),
          buildQuery<MockCtx>("post")
            .path("/")
            .withAuth()
            .withBody({
              validator: z.object({
                _id: z.string().uuid(),
                todoItem: z.string(),
                owner: z.string().uuid(),
                done: z.boolean().default(true),
              }),
            })
            .build(({body}) => {
              body
              throw new Error("")
            }),
        ]),
      }),
      createController({
        path: "/user",
        routes: createRoutes(({createModelRestEndpoints}) => [
          ...createModelRestEndpoints({
            collection: (db) => db.todo,
            validator: z.object({
              _id: z.string().uuid(),
              todoItem: z.string(),
              owner: z.string().uuid(),
              done: z.boolean().default(true),
            }),
            permissions: {
              read: {type: "publicAccess"},
              create: {type: "publicAccess"},
              modify: {type: "publicAccess"},
              delete: {
                type: "modelAuth",
                check: (auth) => ({owner: {Equal: auth.userId}}),
              },
            },
          }),
        ]),
      }),
    ]),
    afterGenerateEndpoints: (app) => {
      app.use("/", async (_req, res): Promise<any> => {
        return res.status(200).json("Welcome to my server!")
      })
    },
  })

  server.generateEndpoints(mockApp)

  return mockApp
}
