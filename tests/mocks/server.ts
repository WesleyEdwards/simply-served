import {z} from "zod"
import express from "express"
import {
  addContext,
  addController,
  buildRoute,
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
  mockApp.use(addContext<MockCtx>({db: todoDb}))

  mockApp.use(async (req, res, next) => {
    const userId = req.headers.authorization?.split(" ")?.at(1)
    if (userId) {
      if (!userId) {
        throw new UnauthorizedError()
      }
      if (userId.length !== 36) {
        throw new UnauthorizedError("Invalid userid")
      }
      ;(req as any).auth = {userId: userId}
    }
    next()
  })

  addController<MockCtx>(mockApp, {
    path: "/todo",
    routes: {
      ...modelRestEndpoints({
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
      testEndpoint: buildRoute<MockCtx>("post")
        .path("/")
        .withAuth()
        .withBody({
          validator: z.object({
            _id: z.uuid(),
            todoItem: z.string(),
            owner: z.uuid(),
            done: z.boolean().default(true),
          }),
        })
        .build(({body, db}) => {
          body
          throw new Error("")
        }),
    },
  })
  addController<MockCtx>(mockApp, {
    path: "/user",
    routes: modelRestEndpoints({
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
  })

  mockApp.use("/", async (_req, res): Promise<any> => {
    return res.status(200).json("Welcome to my server!")
  })

  return mockApp
}

const todoSchema = z.object({
  _id: z.uuid(),
  todoItem: z.string(),
  owner: z.uuid(),
  done: z.boolean().default(true),
})
const userSchema = z.object({
  _id: z.uuid(),
  todoItem: z.string(),
  owner: z.uuid(),
  done: z.boolean().default(true),
})

type TodoType = z.infer<typeof todoSchema>
type UserType = z.infer<typeof userSchema>
