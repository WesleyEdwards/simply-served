import { Query } from "../src/condition/conditionSchema"
import { createQuerySchema } from "../src/condition/conditionSchema"
import { z } from "zod"

// Test schema for validation
const TestSchema = z.object({
  name: z.string(),
  age: z.number(),
})

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
      condition: { name: { Equal: "test" } }
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