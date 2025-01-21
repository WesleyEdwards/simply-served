import {z} from "zod"
import express from "express"
import {createSimplyServer, modelRestEndpoints, verifyAuth} from "../../src"
import todoDb from "./database"
import {TodoDb} from "./types"

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
          done: z.boolean().default(true)
        }),
        permissions: {
          read: {skipAuth: {Always: true}},
          create: {skipAuth: {Always: true}},
          modify: {skipAuth: {Always: true}},
          delete: {
            modelAuth: (auth) => ({owner: {Equal: auth.userId}})
          }
        }
      }),
      user: modelRestEndpoints({
        collection: (db) => db.user,
        validator: z.object({
          _id: z.string().uuid(),
          name: z.string()
        }),
        permissions: {
          create: {skipAuth: {Always: true}},
          read: {skipAuth: {Always: true}},
          modify: {
            modelAuth: (auth) => ({_id: {Equal: auth.userId}})
          },
          delete: {
            userAuth: {Never: true}
          }
        }
      })
    },
    afterGenerateEndpoints: (app) => {
      mockApp.use("/", async (_req, res): Promise<any> => {
        return res.status(200).json("Welcome to my server!")
      })
    }
  })

  server.generateEndpoints(mockApp)

  return mockApp
}

export type MockCtx = {db: TodoDb; auth: {userId: string}}
