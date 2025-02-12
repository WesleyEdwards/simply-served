import express from "express"
import cors from "cors"
import {
  modelRestEndpoints,
  createSimplyServer,
  verifyAuth,
  alwaysAllowed,
  buildQuery
} from "simply-served"
import todoDb from "./todoDb"
import {z} from "zod"
import {Todo, TodoDb} from "./types"

const app = express()

app.use(express.json())
app.use(cors()) // Disable cors

type ServerCtx = {
  db: TodoDb
  auth: {userId: string}
}

const server = createSimplyServer<ServerCtx>({
  initContext: {
    db: todoDb
  },
  middleware: verifyAuth("super-secret-encryption-key"),
  controllers: {
    // Autogenerated rest endpoints for the User model
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
        // Never allow for users to be deleted
        delete: {
          modelAuth: (auth) => ({_id: {Equal: auth.userId}})
        }
      }
    }),
    //  Autogenerated rest endpoints for the Todo model
    todo: [
      ...modelRestEndpoints<ServerCtx, Todo>({
        collection: (db) => db.todo,
        validator: z.object({
          _id: z.string().uuid(),
          todoItem: z.string(),
          owner: z.string().uuid(),
          done: z.boolean().default(true)
        }),
        permissions: alwaysAllowed
      }),
      {
        path: "/my-todos",
        method: "get",
        endpointBuilder: buildQuery<ServerCtx>({
          fun: async ({res, db, auth}) => {
            const myTodos = await db.todo.findMany({
              owner: {Equal: auth.userId}
            })
            return res.status(200).json(myTodos)
          }
        })
      }
    ]
  },
  afterGenerateEndpoints: (app) => {
    app.use("/", async (_req, res): Promise<any> => {
      return res.status(200).json("Welcome to my server!")
    })
  }
})

server.generateEndpoints(app)

console.info("Listening on port 8080\n")
console.info("Check out /frontend/todo.html to interact with the server")

app.listen(8080)
