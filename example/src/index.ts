import express from "express"
import cors from "cors"
import {
  createSimplyServer,
  verifyAuth,
  createControllers,
  buildQuery,
  modelRestEndpoints,
} from "simply-served"
import todoDb from "./todoDb"
import {z} from "zod"
import {TodoDb} from "./types"

const app = express()

app.use(express.json())
app.use(cors()) // Disable cors

type ServerCtx = {
  db: TodoDb
  auth: {
    userId: string
  }
}

const server = createSimplyServer<ServerCtx>({
  initContext: {
    db: todoDb,
  },
  middleware: verifyAuth("super-secret-encryption-key"),
  controllers: createControllers(({createController}) => [
    createController({
      path: "/user",
      routes: modelRestEndpoints({
        validator: z.object({
          _id: z.string().uuid(),
          name: z.string(),
        }),
        collection: (db) => db.user,
        permissions: {
          create: {type: "publicAccess"},
          read: {type: "publicAccess"},
          modify: {
            type: "modelAuth",
            check: (auth) => ({_id: {Equal: auth.userId}}),
          },
          delete: {type: "notAllowed"},
        },
      }),
    }),
    createController({
      path: "/todo",
      routes: [
        //  Autogenerated rest endpoints for the Todo model
        ...modelRestEndpoints({
          collection: (db) => db.todo,
          validator: z.object({
            _id: z.string().uuid(),
            todoItem: z.string(),
            owner: z.string().uuid(),
            done: z.boolean().default(true),
          }),
          permissions: {
            create: {type: "publicAccess"},
            read: {type: "publicAccess"},
            modify: {type: "publicAccess"},
            delete: {type: "publicAccess"},
          },
        }),
        // Custom route for getting the todos of the authenticated user
        buildQuery<ServerCtx>("get")
          .path("/my-todos")
          .withAuth()
          .build(async ({res, db, auth}) => {
            const myTodos = await db.todo.findMany({
              condition: {owner: {Equal: auth.userId}},
            })
            return res.status(200).json(myTodos)
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

server.generateEndpoints(app)

console.info("Listening on port 8080\n")
console.info("Check out /frontend/todo.html to interact with the server")

app.listen(8080)
