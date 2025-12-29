import express from "express"
import request from "supertest"
import {z} from "zod"
import {
  addContext,
  addController,
  modelRestEndpoints,
  inMemoryDb,
  DbMethods,
} from "../src"
import {LocalCollection} from "../src/ram-unsafe/localCollection"

// Unit tests for LocalCollection.count()
describe("LocalCollection.count()", () => {
  type TestItem = {
    _id: string
    name: string
    age: number
  }

  const testItems: TestItem[] = [
    {_id: "1", name: "Charlie", age: 30},
    {_id: "2", name: "Alice", age: 25},
    {_id: "3", name: "Bob", age: 35},
    {_id: "4", name: "Alice", age: 20},
  ]

  test("counts all items when no filter", async () => {
    const collection = new LocalCollection<TestItem>([...testItems])
    const count = await collection.count()
    expect(count).toBe(4)
  })

  test("counts items matching condition", async () => {
    const collection = new LocalCollection<TestItem>([...testItems])
    const count = await collection.count({name: {Equal: "Alice"}})
    expect(count).toBe(2)
  })

  test("returns 0 when no items match", async () => {
    const collection = new LocalCollection<TestItem>([...testItems])
    const count = await collection.count({name: {Equal: "NonExistent"}})
    expect(count).toBe(0)
  })

  test("counts with complex condition", async () => {
    const collection = new LocalCollection<TestItem>([...testItems])
    const count = await collection.count({age: {GreaterThan: 25}})
    expect(count).toBe(2) // Charlie (30) and Bob (35)
  })
})

// Integration tests for POST /count endpoint
describe("POST /count endpoint", () => {
  type Item = {
    _id: string
    name: string
    owner: string
  }

  type TestCtx = {
    db: {item: DbMethods<Item>}
    auth: {userId: string}
  }

  const itemSchema = z.object({
    _id: z.uuid(),
    name: z.string().min(1),
    owner: z.uuid(),
  })

  const existingItem: Item = {
    _id: "59abd624-4e2a-4f33-ac1e-e27219f39073",
    name: "Test Item",
    owner: "8340d517-888d-47fb-886d-dbde1f9ea2c5",
  }

  const ownerId = existingItem.owner
  const otherUserId = "11d82d5c-1907-4a4b-b5f5-d3fd949ba4a3"

  const createTestServer = (items: Item[] = []) => {
    const app = express()
    app.use(express.json())

    const db = inMemoryDb<{item: Item}>({item: items})

    app.use(addContext<TestCtx>({db}))

    // Simple auth middleware that reads userId from Authorization header
    app.use((req, _res, next) => {
      const userId = req.headers.authorization?.split(" ")?.at(1)
      if (userId) {
        ;(req as any).auth = {userId}
      }
      next()
    })

    // Public endpoints
    addController<TestCtx>(app, {
      path: "/public",
      routes: modelRestEndpoints({
        collection: (db) => db.item,
        validator: itemSchema,
        permissions: {
          read: {type: "publicAccess"},
          create: {type: "publicAccess"},
          modify: {type: "publicAccess"},
          delete: {type: "publicAccess"},
        },
      }),
    })

    // Restricted endpoints with modelAuth for read
    addController<TestCtx>(app, {
      path: "/restricted",
      routes: modelRestEndpoints({
        collection: (db) => db.item,
        validator: itemSchema,
        permissions: {
          read: {
            type: "modelAuth",
            check: async ({auth}) => ({owner: {Equal: auth.userId}}),
          },
          create: {
            type: "modelAuth",
            check: async ({auth}) => ({owner: {Equal: auth.userId}}),
          },
          modify: {
            type: "modelAuth",
            check: async ({auth}) => ({owner: {Equal: auth.userId}}),
          },
          delete: {
            type: "modelAuth",
            check: async ({auth}) => ({owner: {Equal: auth.userId}}),
          },
        },
      }),
    })

    return app
  }

  it("returns count of all items when no condition", async () => {
    const items = [
      existingItem,
      {...existingItem, _id: "a1b2c3d4-e5f6-4a7b-8c9d-000000000001"},
      {...existingItem, _id: "a1b2c3d4-e5f6-4a7b-8c9d-000000000002"},
    ]
    const app = createTestServer(items)

    const res = await request(app).post("/public/count").send({})

    expect(res.status).toBe(200)
    expect(res.body.count).toBe(3)
  })

  it("returns count matching condition", async () => {
    const items = [
      {...existingItem, name: "Alice"},
      {...existingItem, _id: "a1b2c3d4-e5f6-4a7b-8c9d-000000000001", name: "Bob"},
      {...existingItem, _id: "a1b2c3d4-e5f6-4a7b-8c9d-000000000002", name: "Alice"},
    ]
    const app = createTestServer(items)

    const res = await request(app)
      .post("/public/count")
      .send({condition: {name: {Equal: "Alice"}}})

    expect(res.status).toBe(200)
    expect(res.body.count).toBe(2)
  })

  it("respects read permissions (only counts items user can read)", async () => {
    const items = [
      {...existingItem, owner: ownerId},
      {...existingItem, _id: "a1b2c3d4-e5f6-4a7b-8c9d-000000000001", owner: otherUserId},
      {...existingItem, _id: "a1b2c3d4-e5f6-4a7b-8c9d-000000000002", owner: ownerId},
    ]
    const app = createTestServer(items)

    // Restricted endpoint uses modelAuth - user can only read their own items
    const res = await request(app)
      .post("/restricted/count")
      .set("Authorization", `Bearer ${ownerId}`)
      .send({})

    expect(res.status).toBe(200)
    expect(res.body.count).toBe(2) // Only the 2 items owned by ownerId
  })

  it("returns 0 when no items match", async () => {
    const app = createTestServer([existingItem])

    const res = await request(app)
      .post("/public/count")
      .send({condition: {name: {Equal: "NonExistent"}}})

    expect(res.status).toBe(200)
    expect(res.body.count).toBe(0)
  })
})
