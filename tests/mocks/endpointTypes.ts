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
    .idPath("/sdfth/:myId")
    .withCustomAuth((s, d) => {
      return d.myId === "sdf"
    })
    .build(({auth, myId}) => {
      myId
      auth.permissions
      return Promise.reject()
    }),

  buildQuery<Ctx>("get")
    .path("/p")
    .build(({auth}) => {
      auth
      return Promise.reject()
    }),
  buildQuery<Ctx>("post")
    .idPath("/:userId")
    .withBody({
      validator: z.object({
        item: z.string(),
      }),
    })
    .build(({auth, req, body, userId}) => {
      body
      req.body
      auth
      return Promise.reject("id" + userId)
    }),
  buildQuery<Ctx>("get")
    .idPath("/:id")
    .withAuth()
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
      auth.permissions
      throw new Error("")
    }),

  buildQuery<Ctx>("post")
    .path("/asdf")
    .withAuth()
    .withBody({
      validator: z.object({levels: z.array(z.string())}),
    })
    .build(async ({req, res, db, auth}) => {
      auth
      return res.json({})
    }),
]
