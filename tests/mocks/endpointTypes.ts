import {z} from "zod"
import {buildQuery, Route} from "../../src"

type Ctx = {
  auth: {
    userId: string
    permissions: {
      read: boolean
      create: "none" | "all" | "some"
    }
  }
  db: {
    users: () => string
  }
}

const builders = [
  buildQuery<Ctx>("get")
    .idPath("/sdfth/:id")
    .withAuth({type: "customAuth", check: () => true})
    .build(({auth}) => {
      auth.permissions
      return Promise.reject()
    }),

  buildQuery<Ctx>("get")
    .path("/p")
    .withAuth({type: "publicAccess"})
    .build(({auth}) => {
      auth
      return Promise.reject()
    }),
  buildQuery<Ctx>("post")
    .idPath("/:id")
    .withAuth({type: "publicAccess"})
    .withBody({
      validator: z.object({
        item: z.string(),
      }),
    })
    .build(({auth, req, body, id}) => {
      body
      req.body
      auth
      return Promise.reject("id" + id)
    }),
  buildQuery<Ctx>("get")
    .idPath("/:id")
    .withAuth({type: "authenticated"})
    .withBody({
      validator: z.object({
        _id: z.string().uuid(),
        todoItem: z.string(),
        owner: z.string().uuid(),
        done: z.boolean().default(true),
      }),
    })
    .build(async ({res, db, auth, req, id}) => {
      req.body
      //   const myTodos = await db.todo.findMany({
      //     condition: {owner: {Equal: auth.userId}},
      //   })
      throw new Error("")
    }),

  buildQuery<Ctx>("post")
    .path("/asdf")
    .withAuth({type: "authenticated"})
    .withBody({
      validator: z.object({levels: z.array(z.string())}),
    })
    .build(async ({req, res, db, auth}) => {
      auth
      return res.json({})
    }),
]
