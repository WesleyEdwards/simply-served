import {z} from "zod"
import {buildRoute, buildRouteRaw, EndpointBuilderType, Route} from "../../src"

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

// These will have errors if the typing is incorrect
const builders = [
  buildRoute<TestContext>("get")
    .idPath("/sdfth/:myId")
    .withCustomAuth((s, d) => {
      return d.myId === "sdf"
    })
    .build((_req, _res, auth, {myId}) => {
      myId
      auth.permissions
      return Promise.reject()
    }),

  buildRoute<TestContext>("get")
    .path("/p")
    .withAuth()
    .build(async ({db}, _res, auth) => {
      auth.userId
      db.users()
      return Promise.reject()
    }),
  buildRoute<TestContext>("post")
    .idPath("/:userId")
    .withBody({
      validator: z.object({
        item: z.string(),
      }),
    })
    .build(({body}, res, auth, {userId}) => {
      body.item
      auth
      return Promise.reject("id" + userId)
    }),
  buildRoute<TestContext>("get")
    .idPath("/:id")
    .withAuth()
    .withBody({
      validator: z.object({
        _id: z.uuid(),
        todoItem: z.string(),
        owner: z.uuid(),
        done: z.boolean().default(true),
      }),
    })
    .build(async (req, res, auth) => {
      req.body
      auth.permissions
      throw new Error("")
    }),

  buildRoute<TestContext>("post")
    .path("/asdf")
    .withAuth()
    .withBody({
      validator: z.object({levels: z.array(z.string())}),
    })
    .build(async ({db}, res, auth) => {
      auth
      return res.json({})
    }),
  buildRouteRaw({
    route: {
      authPath: {
        type: "authenticated",
        path: {type: "route", route: "/sample"},
      },
      method: "get",
      fun: () => {
        throw new Error("")
      },
    },
  }),
]
