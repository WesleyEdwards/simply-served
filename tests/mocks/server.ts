import {z} from "zod"
import express from "express"
import {
  buildRoute,
  createControllers,
  createSimplyServer,
  modelRestEndpoints,
  UnauthorizedError,
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
    getAuth: (req) => {
      const userId = req.headers.authorization?.split(" ")?.at(1)
      if (userId) {
        if (!userId) {
          throw new UnauthorizedError()
        }
        if (userId.length !== 36) {
          throw new UnauthorizedError("Invalid userid")
        }
        return {userId: userId}
      }
      return undefined
    },
    controllers: createControllers(({createController}) => [
      createController({
        path: "/todo",
        routes: [
          ...modelRestEndpoints<MockCtx, TodoType>({
            collection: (db) => db.todo,
            validator: todoSchema,
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
          buildRoute<MockCtx>("post")
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
        ],
      }),
      createController({
        path: "/user",
        routes: [
          ...modelRestEndpoints<MockCtx, UserType>({
            collection: (db) => db.todo,
            validator: userSchema,
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
        ],
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

export type TodoType = z.infer<typeof todoSchema>

const todoSchema = z.object({
  _id: z.string().uuid(),
  todoItem: z.string(),
  owner: z.string().uuid(),
  done: z.boolean().default(true),
})
const userSchema = z.object({
  _id: z.string().uuid(),
  todoItem: z.string(),
  owner: z.string().uuid(),
  done: z.boolean().default(true),
})
type UserType = z.infer<typeof userSchema>
