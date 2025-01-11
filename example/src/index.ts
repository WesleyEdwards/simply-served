import express from "express"
import cors from "cors"
import {modelRestEndpoints, createSimplyServer} from "simply-served"
import todoDb from "./todoDb"
import {z} from "zod"
import {TodoDb} from "./types"

const app = express()

app.use(express.json())
app.use(cors()) // Disable cors

type DbAndAuth = {db: TodoDb; userId?: string}

const server = createSimplyServer<DbAndAuth>({
  initContext: {
    db: todoDb
  },
  middleware: (req, initContext, skipAuth) => {
    const idFromHeaders = req.headers["x-userid"] as string | undefined
    if (idFromHeaders) {
      return {db: initContext.db, userId: idFromHeaders}
    }
    if (skipAuth) return {db: initContext.db}
    return null
  },
  controllers: {
    //  Autogenerated rest endpoints for the Todo model
    todo: modelRestEndpoints({
      endpoint: (db) => db.todo,
      validator: z.object({
        _id: z.string().uuid(),
        todoItem: z.string(),
        owner: z.string().uuid(),
        done: z.boolean().default(true)
      }),
      permissions: {
        read: () => ({Always: true}),
        create: () => ({Always: true}),
        modify: () => ({Always: true}),
        delete: ({userId}) => ({owner: {Equal: userId ?? ""}})
      }
    }),
    // Autogenerated rest endpoints for the User model
    user: modelRestEndpoints({
      endpoint: (db) => db.user,
      validator: z.object({
        _id: z.string().uuid(),
        name: z.string()
      }),
      permissions: {
        create: () => ({Always: true}),
        read: () => ({Always: true}),
        modify: ({userId}) => ({_id: {Equal: userId ?? ""}}),
        // Never allow for users to be deleted
        delete: () => ({Never: true})
      },
      skipAuth: {
        // Allow unauthenticated users to view users
        get: true,
        query: true
      }
    })
  },
  afterGenerateEndpoints: (app) => {
    app.use("/", async (_req, res): Promise<any> => {
      return res.status(200).json("Welcome to my server!")
    })
  }
})

server.generateEndpoints(app)

console.info("Listening on port 8080")

app.listen(8080)
