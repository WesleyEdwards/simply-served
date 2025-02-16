import {z} from "zod"
import express from "express"
import {createSimplyServer, modelRestEndpoints, verifyAuth} from "../../src"
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
    controllers: {
      todo: modelRestEndpoints({
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
      user: modelRestEndpoints({
        collection: (db) => db.user,
        validator: z.object({
          _id: z.string().uuid(),
          name: z.string(),
        }),
        permissions: {
          create: {type: "publicAccess"},
          read: {type: "publicAccess"},
          modify: {
            type: "modelAuth",
            check: (auth) => ({_id: {Equal: auth.userId}}),
          },
          delete: {
            type: "notAllowed",
          },
        },
      }),
    },
    afterGenerateEndpoints: (app) => {
      mockApp.use("/", async (_req, res): Promise<any> => {
        return res.status(200).json("Welcome to my server!")
      })
    },
  })

  server.generateEndpoints(mockApp)

  return mockApp
}
