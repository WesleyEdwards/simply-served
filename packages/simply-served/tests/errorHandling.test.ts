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

  // Public endpoints for testing basic errors
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

  // Restricted endpoints for testing permission errors
  addController<TestCtx>(app, {
    path: "/restricted",
    routes: modelRestEndpoints({
      collection: (db) => db.item,
      validator: itemSchema,
      permissions: {
        read: {type: "publicAccess"},
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

describe("Error Handling", () => {
  // Use valid UUIDs (v4 format)
  const existingItem: Item = {
    _id: "59abd624-4e2a-4f33-ac1e-e27219f39073",
    name: "Test Item",
    owner: "8340d517-888d-47fb-886d-dbde1f9ea2c5",
  }

  const nonExistentId = "0fe75f44-ddd8-49ed-af0a-12838b8d928f"
  const ownerId = existingItem.owner
  const otherUserId = "11d82d5c-1907-4a4b-b5f5-d3fd949ba4a3"

  describe("GET /detail/:id", () => {
    it("returns 404 with item id when item not found", async () => {
      const app = createTestServer([existingItem])

      const res = await request(app).get(`/public/detail/${nonExistentId}`)

      expect(res.status).toBe(404)
      expect(res.body.error).toContain(nonExistentId)
      expect(res.body.error).toContain("not found")
    })

    it("returns 200 with item when found", async () => {
      const app = createTestServer([existingItem])

      const res = await request(app).get(`/public/detail/${existingItem._id}`)

      expect(res.status).toBe(200)
      expect(res.body._id).toBe(existingItem._id)
    })
  })

  describe("POST /insert", () => {
    it("returns 403 when permission denied for create", async () => {
      const app = createTestServer()

      const newItem = {
        _id: "1334cb13-430a-4eea-a121-fda301bdbe97",
        name: "New Item",
        owner: ownerId, // Trying to create item owned by someone else
      }

      const res = await request(app)
        .post("/restricted/insert")
        .set("Authorization", `Bearer ${otherUserId}`)
        .send(newItem)

      expect(res.status).toBe(403)
      expect(res.body.error).toContain("Permission denied")
    })

    it("returns 200 when user creates item they own", async () => {
      const app = createTestServer()

      const newItem = {
        _id: "077b18b8-034c-41fc-b091-975e07fea9e6",
        name: "New Item",
        owner: ownerId,
      }

      const res = await request(app)
        .post("/restricted/insert")
        .set("Authorization", `Bearer ${ownerId}`)
        .send(newItem)

      expect(res.status).toBe(200)
      expect(res.body._id).toBe(newItem._id)
    })

    it("returns 400 when body validation fails", async () => {
      const app = createTestServer()

      const invalidItem = {
        _id: "not-a-uuid",
        name: "Test",
        owner: "also-not-uuid",
      }

      const res = await request(app).post("/public/insert").send(invalidItem)

      expect(res.status).toBe(400)
    })

    it("returns 400 when required field is missing", async () => {
      const app = createTestServer()

      const incompleteItem = {
        _id: "59abd624-4e2a-4f33-ac1e-e27219f39073",
        // missing name and owner
      }

      const res = await request(app).post("/public/insert").send(incompleteItem)

      expect(res.status).toBe(400)
    })
  })

  describe("PUT /modify/:id", () => {
    it("returns 404 when item not found", async () => {
      const app = createTestServer([existingItem])

      const res = await request(app)
        .put(`/public/modify/${nonExistentId}`)
        .send({name: "Updated"})

      expect(res.status).toBe(404)
      expect(res.body.error).toContain(nonExistentId)
      expect(res.body.error).toContain("not found")
    })

    it("returns 404 when user lacks permission to modify", async () => {
      const app = createTestServer([existingItem])

      const res = await request(app)
        .put(`/restricted/modify/${existingItem._id}`)
        .set("Authorization", `Bearer ${otherUserId}`)
        .send({name: "Updated"})

      expect(res.status).toBe(404)
      expect(res.body.error).toContain("not found or access denied")
    })

    it("returns 200 when owner modifies their item", async () => {
      const app = createTestServer([existingItem])

      const res = await request(app)
        .put(`/restricted/modify/${existingItem._id}`)
        .set("Authorization", `Bearer ${ownerId}`)
        .send({name: "Updated Name"})

      expect(res.status).toBe(200)
      expect(res.body.name).toBe("Updated Name")
    })
  })

  describe("DELETE /:id", () => {
    it("returns 404 when item not found", async () => {
      const app = createTestServer([existingItem])

      const res = await request(app).delete(`/public/${nonExistentId}`)

      expect(res.status).toBe(404)
      expect(res.body.error).toContain(nonExistentId)
      expect(res.body.error).toContain("not found")
    })

    it("returns 404 when user lacks permission to delete", async () => {
      const app = createTestServer([existingItem])

      const res = await request(app)
        .delete(`/restricted/${existingItem._id}`)
        .set("Authorization", `Bearer ${otherUserId}`)

      expect(res.status).toBe(404)
      expect(res.body.error).toContain("not found or access denied")
    })

    it("returns 200 with deleted id when owner deletes their item", async () => {
      const app = createTestServer([existingItem])

      const res = await request(app)
        .delete(`/restricted/${existingItem._id}`)
        .set("Authorization", `Bearer ${ownerId}`)

      expect(res.status).toBe(200)
      expect(res.body).toBe(existingItem._id)
    })
  })

  describe("POST /query", () => {
    it("returns empty array when no items match", async () => {
      const app = createTestServer([existingItem])

      const res = await request(app)
        .post("/public/query")
        .send({condition: {name: {Equal: "nonexistent"}}})

      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })

    it("returns matching items", async () => {
      const app = createTestServer([existingItem])

      const res = await request(app)
        .post("/public/query")
        .send({condition: {name: {Equal: existingItem.name}}})

      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(1)
      expect(res.body[0]._id).toBe(existingItem._id)
    })

    it("returns 400 for invalid query body", async () => {
      const app = createTestServer()

      const res = await request(app)
        .post("/public/query")
        .send({condition: {invalidField: {InvalidOp: "value"}}})

      expect(res.status).toBe(400)
    })
  })
})
