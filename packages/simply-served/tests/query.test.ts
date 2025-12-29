import {Query} from "../src/server/query"
import {createQuerySchema, MAX_LIMIT} from "../src/condition/conditionSchema"
import {LocalCollection} from "../src/ram-unsafe/localCollection"
import {z} from "zod"

// Test schema for validation
const TestSchema = z.object({
  _id: z.string(),
  name: z.string(),
  age: z.number(),
})

type TestItem = z.infer<typeof TestSchema>

describe("Query Type", () => {
  test("should accept skip property", () => {
    const query: Query<z.infer<typeof TestSchema>> = {
      skip: 10,
      limit: 5,
    }

    expect(query.skip).toBe(10)
    expect(query.limit).toBe(5)
  })

  test("should work with createQuerySchema", () => {
    const querySchema = createQuerySchema(TestSchema)

    const validQuery = {
      skip: 5,
      limit: 10,
      condition: {name: {Equal: "test"}},
    }

    const result = querySchema.parse(validQuery)
    expect(result.skip).toBe(5)
    expect(result.limit).toBe(10)
  })

  test("should make skip optional", () => {
    const query: Query<z.infer<typeof TestSchema>> = {
      limit: 5,
    }

    expect(query.skip).toBeUndefined()
    expect(query.limit).toBe(5)
  })

  test("should validate skip as number", () => {
    const querySchema = createQuerySchema(TestSchema)

    expect(() => {
      querySchema.parse({
        skip: "not a number",
        limit: 10,
      })
    }).toThrow()
  })
})

describe("Pagination Validation", () => {
  const querySchema = createQuerySchema(TestSchema)

  describe("skip validation", () => {
    test("rejects negative skip", () => {
      const result = querySchema.safeParse({skip: -1})
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("negative")
      }
    })

    test("rejects non-integer skip", () => {
      const result = querySchema.safeParse({skip: 1.5})
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("integer")
      }
    })

    test("accepts zero skip", () => {
      const result = querySchema.safeParse({skip: 0})
      expect(result.success).toBe(true)
    })

    test("accepts positive integer skip", () => {
      const result = querySchema.safeParse({skip: 100})
      expect(result.success).toBe(true)
    })
  })

  describe("limit validation", () => {
    test("rejects zero limit", () => {
      const result = querySchema.safeParse({limit: 0})
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("at least 1")
      }
    })

    test("rejects negative limit", () => {
      const result = querySchema.safeParse({limit: -5})
      expect(result.success).toBe(false)
    })

    test("rejects non-integer limit", () => {
      const result = querySchema.safeParse({limit: 10.5})
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("integer")
      }
    })

    test("rejects limit exceeding default max", () => {
      const result = querySchema.safeParse({limit: MAX_LIMIT + 1})
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(`${MAX_LIMIT}`)
      }
    })

    test("accepts limit at default max", () => {
      const result = querySchema.safeParse({limit: MAX_LIMIT})
      expect(result.success).toBe(true)
    })

    test("accepts valid limit", () => {
      const result = querySchema.safeParse({limit: 50})
      expect(result.success).toBe(true)
    })
  })
})

describe("Sort Validation", () => {
  const querySchema = createQuerySchema(TestSchema)

  test("accepts valid sort with asc order", () => {
    const result = querySchema.safeParse({
      sort: [{field: "name", order: "asc"}],
    })
    expect(result.success).toBe(true)
  })

  test("accepts valid sort with desc order", () => {
    const result = querySchema.safeParse({
      sort: [{field: "age", order: "desc"}],
    })
    expect(result.success).toBe(true)
  })

  test("accepts multiple sort fields", () => {
    const result = querySchema.safeParse({
      sort: [
        {field: "name", order: "asc"},
        {field: "age", order: "desc"},
      ],
    })
    expect(result.success).toBe(true)
  })

  test("rejects invalid field name", () => {
    const result = querySchema.safeParse({
      sort: [{field: "invalidField", order: "asc"}],
    })
    expect(result.success).toBe(false)
  })

  test("rejects invalid order", () => {
    const result = querySchema.safeParse({
      sort: [{field: "name", order: "invalid"}],
    })
    expect(result.success).toBe(false)
  })

  test("sort is optional", () => {
    const result = querySchema.safeParse({limit: 10})
    expect(result.success).toBe(true)
  })
})

describe("Sort Execution", () => {
  const testItems: TestItem[] = [
    {_id: "1", name: "Charlie", age: 30},
    {_id: "2", name: "Alice", age: 25},
    {_id: "3", name: "Bob", age: 35},
    {_id: "4", name: "Alice", age: 20},
  ]

  test("sorts by single field ascending", async () => {
    const collection = new LocalCollection<TestItem>([...testItems])
    const results = await collection.findMany({
      sort: [{field: "name", order: "asc"}],
    })

    expect(results.map((r) => r.name)).toEqual([
      "Alice",
      "Alice",
      "Bob",
      "Charlie",
    ])
  })

  test("sorts by single field descending", async () => {
    const collection = new LocalCollection<TestItem>([...testItems])
    const results = await collection.findMany({
      sort: [{field: "age", order: "desc"}],
    })

    expect(results.map((r) => r.age)).toEqual([35, 30, 25, 20])
  })

  test("sorts by multiple fields", async () => {
    const collection = new LocalCollection<TestItem>([...testItems])
    const results = await collection.findMany({
      sort: [
        {field: "name", order: "asc"},
        {field: "age", order: "desc"},
      ],
    })

    // Alice entries first (sorted by age desc), then Bob, then Charlie
    expect(results.map((r) => ({name: r.name, age: r.age}))).toEqual([
      {name: "Alice", age: 25},
      {name: "Alice", age: 20},
      {name: "Bob", age: 35},
      {name: "Charlie", age: 30},
    ])
  })

  test("sort is applied before skip/limit", async () => {
    const collection = new LocalCollection<TestItem>([...testItems])
    const results = await collection.findMany({
      sort: [{field: "age", order: "asc"}],
      skip: 1,
      limit: 2,
    })

    // Sorted by age: 20, 25, 30, 35 -> skip 1, take 2 -> 25, 30
    expect(results.map((r) => r.age)).toEqual([25, 30])
  })

  test("returns unsorted when no sort specified", async () => {
    const collection = new LocalCollection<TestItem>([...testItems])
    const results = await collection.findMany({})

    // Should return in original order
    expect(results.map((r) => r._id)).toEqual(["1", "2", "3", "4"])
  })
})

