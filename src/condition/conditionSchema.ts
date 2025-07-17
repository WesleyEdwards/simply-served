import {z} from "zod"
import {Parsable} from "../server/validation"
import {ParseError} from "../server/errorHandling"
import {Condition} from "./condition"

export type Query<T> = {
  condition?: Condition<T>
  limit?: number
}

export const createQuerySchema = <T>(
  schema: z.ZodType<T, any, any>
): Parsable<Query<T>> => ({
  parse: (data: any) => {
    return {
      condition: data.condition
        ? createConditionSchema(schema).parse(data.condition)
        : undefined,
      limit: typeof data.limit === "number" ? data.limit : undefined,
    }
  },
})

export const createConditionSchema = <T>(
  schema: z.ZodType<T>
): Parsable<Condition<T>> => ({
  parse: (body: any) => {
    if (
      typeof body !== "object" ||
      body === null ||
      body === undefined ||
      Array.isArray(body)
    ) {
      throw new ParseError("Invalid condition type")
    }

    const bodyKeys = Object.keys(body)
    if (bodyKeys.length !== 1) {
      throw new ParseError("Single key expected")
    }

    const key = bodyKeys[0]

    if (key === "Always" || key === "never") {
      return z.object({[key]: z.literal(true)}).parse(body)
    }

    if (
      [
        "Equal",
        "GreaterThan",
        "GreaterThanOrEqual",
        "LessThan",
        "LessThanOrEqual",
      ].includes(key)
    ) {
      return z.object({[key]: schema}).parse(body)
    }

    if (key === "Inside") {
      return z.object({Inside: schema.array()}).parse(body)
    }
    if (key === "ListAnyElement") {
      if (schema instanceof z.ZodArray) {
        // Test
        createConditionSchema(schema.element as any).parse(body[key])
        return z.object({ListAnyElement: z.any()}).parse(body)
      }
    }
    if (key === "StringContains") {
      return z
        .object({
          StringContains: z.object({
            value: z.string(),
            ignoreCase: z.boolean(),
          }),
        })
        .parse(body)
    }

    if (key === "And" || key === "Or") {
      if (!Array.isArray(body[key])) {
        throw new ParseError(`invalid condition for body ${body}, key: ${key}`)
      }
      const others = createConditionSchema(schema)
      for (const item of body[key]) {
        // Test
        others.parse(item)
      }
      return z.object({[key]: z.any()}).parse(body)
    }

    if (
      "shape" in schema &&
      typeof schema.shape === "object" &&
      schema.shape !== null
    ) {
      const valueKeys = Object.keys(schema.shape)
      if (!valueKeys.includes(key)) {
        throw new ParseError(`Invalid key condition ${key}`)
      }

      const subSchema = createConditionSchema((schema.shape as any)[key])
      // Test
      subSchema.parse(body[key])
      return z.object({[key]: z.any()}).parse(body)
    }
    throw new ParseError("Invalid condition. Options exhausted")
  },
})
