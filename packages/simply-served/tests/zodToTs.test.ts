import {zodToTs} from "../src/meta/sdkGenerator"
import {z} from "zod"
import {createQuerySchema} from "../src/condition/conditionSchema"

describe("zodToTs", () => {
  test("should convert basic types", () => {
    expect(zodToTs(z.string())).toBe("string")
    expect(zodToTs(z.number())).toBe("number")
    expect(zodToTs(z.boolean())).toBe("boolean")
    expect(zodToTs(z.date())).toBe("Date")
    expect(zodToTs(z.null())).toBe("null")
    expect(zodToTs(z.undefined())).toBe("undefined")
    expect(zodToTs(z.any())).toBe("any")
    expect(zodToTs(z.unknown())).toBe("unknown")
    expect(zodToTs(z.void())).toBe("void")
  })

  test("should convert arrays", () => {
    expect(zodToTs(z.array(z.string()))).toBe("string[]")
    expect(zodToTs(z.array(z.number()))).toBe("number[]")
    expect(zodToTs(z.array(z.object({a: z.string()})))).toBe("{\n\ta: string\n}[]")
  })

  test("should convert objects", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
      isActive: z.boolean().optional(),
    })
    const expected = `{\n\tname: string;\n\tage: number;\n\tisActive?: boolean | undefined\n}`
    expect(zodToTs(schema)).toBe(expected)
  })

  test("should convert nested objects", () => {
    const schema = z.object({
      user: z.object({
        id: z.string(),
        profile: z.object({
          bio: z.string(),
        }),
      }),
    })
    const expected = `{\n\tuser: {\n\tid: string;\n\tprofile: {\n\tbio: string\n}\n}\n}`
    expect(zodToTs(schema)).toBe(expected)
  })

  test("should convert optional and nullable", () => {
    expect(zodToTs(z.string().optional())).toBe("string | undefined")
    expect(zodToTs(z.string().nullable())).toBe("string | null")
    expect(zodToTs(z.string().nullish())).toBe("string | null | undefined")
  })

  test("should convert unions and intersections", () => {
    expect(zodToTs(z.union([z.string(), z.number()]))).toBe("string | number")
    expect(zodToTs(z.intersection(z.object({a: z.string()}), z.object({b: z.number()}))))
      .toBe("{\n\ta: string\n} & {\n\tb: number\n}")
  })

  test("should convert enums and literals", () => {
    expect(zodToTs(z.enum(["A", "B"]))).toBe('"A" | "B"')
    expect(zodToTs(z.literal("test"))).toBe('"test"')
    expect(zodToTs(z.literal(123))).toBe("123")
    expect(zodToTs(z.literal(true))).toBe("true")
  })

  test("should convert Query type", () => {
    const userSchema = z.object({name: z.string()})
    const querySchema = createQuerySchema(userSchema)
    // We pass "User" as the name, so it should return Query<User>
    expect(zodToTs(querySchema, "User")).toBe("Query<User>")
  })

  test("Should handle defaults correctly", () => {
    const schema = z.object({
      name: z.string().default("John Doe"),
      age: z.number().default(30),
    })
    const expected = `{
	name: string;
	age: number
}`
    expect(zodToTs(schema)).toBe(expected)
  })
})
