import {z} from "zod"
import {buildQuery, EndpointBuilderType, Route} from "../../src"

type TestContext = {
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
  buildQuery<TestContext>("get")
    .idPath("/sdfth/:myId")
    .withCustomAuth((s, d) => {
      return d.myId === "sdf"
    })
    .build(({myId}, auth) => {
      myId
      auth.permissions
      return Promise.reject()
    }),

  buildQuery<TestContext>("get")
    .path("/p")
    .withAuth()
    .build(({auth, db}, auth1) => {
      db.users()
      return Promise.reject()
    }),
  buildQuery<TestContext>("post")
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
  buildQuery<TestContext>("get")
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
    .build(async ({res, db, req, id}, auth) => {
      req.body
      auth.permissions
      throw new Error("")
    }),

  buildQuery<TestContext>("post")
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
