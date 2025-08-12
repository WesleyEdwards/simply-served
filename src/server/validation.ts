import {z} from "zod"
import {v4 as uuidv4} from "uuid"
import {ParseError} from "./errorHandling"

export const baseObjectSchema = z.object({
  _id: z.uuid().default(uuidv4),
})

export type Parsable<T> = {
  parse: (data: unknown) => T
}

export const partialValidator = <T>(
  schema: z.ZodType<T, any, any>
): Parsable<Partial<T>> => ({
  parse: (body: any) => {
    if ("partial" in schema && typeof schema.partial === "function") {
      return schema.partial().parse(body)
    }
    throw new ParseError("Invalid schema")
  },
})
