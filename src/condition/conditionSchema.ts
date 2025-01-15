import {z} from "zod"
import {
  checkPartialValidation,
  isValid,
  SafeParsable
} from "../server/validation"

export const createConditionSchema = <T>(
  schema: z.ZodType<T, any, any>
): SafeParsable<T> => {
  return {
    safeParse: (body: any) => {
      if (
        typeof body !== "object" ||
        body === null ||
        body === undefined ||
        Array.isArray(body)
      ) {
        return errorMessage("Invalid condition type")
      }

      const bodyKeys = Object.keys(body)
      if (bodyKeys.length !== 1) {
        return errorMessage("Single key expected")
      }

      const key = bodyKeys[0]

      if (key === "Always" || key === "never") {
        return z.object({[key]: z.literal(true)}).safeParse(body) as SF<T>
      }

      if (key === "Equal") {
        return z.object({Equal: schema}).safeParse(body) as SF<T>
      }
      if (key === "Inside") {
        return z.object({Inside: schema.array()}).safeParse(body) as SF<T>
      }
      if (key === "ListAnyElement") {
        if (schema instanceof z.ZodArray) {
          const others = createConditionSchema(schema.element)
          if (others.safeParse(body[key]).success === false) {
            return errorMessage("invalid ListAnyElement condition")
          }
          return z
            .object({ListAnyElement: z.any(body[key])})
            .safeParse(body) as SF<T>
        }
      }

      if (key === "And" || key === "Or") {
        if (!Array.isArray(body[key])) {
          return errorMessage(`invalid condition for body ${body}, key: ${key}`)
        }
        const others = createConditionSchema(schema)
        for (const item of body[key]) {
          if (others.safeParse(item).success === false) {
            return errorMessage("invalid condition for item")
          }
        }
        return z
          .object({[key]: z.any({[key]: body[key]})})
          .safeParse(body) as SF<T>
      }

      if (
        "shape" in schema &&
        typeof schema.shape === "object" &&
        schema.shape !== null
      ) {
        const valueKeys = Object.keys(schema.shape)
        if (!valueKeys.includes(key)) {
          return errorMessage(`Invalid key condition ${key}`)
        }

        const subSchema = createConditionSchema((schema.shape as any)[key])
        if (subSchema.safeParse(body[key]).success === false) {
          return errorMessage("invalid subSchema condition")
        }
        return z.object({[key]: z.any(body[key])}).safeParse(body) as SF<T>
      }
      return errorMessage(`Invalid condition. Options exhausted`)
    }
  }
}

type SF<T> = ReturnType<SafeParsable<T>["safeParse"]>

const errorMessage = (message: string) =>
  ({success: false, error: {message}} as const)

export const partialValidator = <T>(
  schema: z.ZodType<T, any, any>
): SafeParsable<Partial<T>> => {
  return {
    safeParse: (body: any) => {
      if ("partial" in schema && typeof schema.partial === "function") {
        // if (schema instanceof z.ZodObject) {
        const partial = checkPartialValidation(
          body,
          schema as unknown as z.ZodObject<any, any>
        )
        if (!isValid<T>(partial)) {
          return {success: false, error: "Invalid partial"}
        }
        return {success: true, data: partial}
      }
      return {success: false, error: "Invalid schema"}
    }
  }
}
