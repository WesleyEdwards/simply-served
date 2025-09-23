import {z} from "zod"
import {v4 as uuidv4} from "uuid"

export const baseObjectSchema = z.object({
  _id: z.uuid().default(uuidv4),
})

// export type Parsable<T> = z.ZodType<T, T>

export type Parsable<T> = {
  parse: (data: unknown, ...args: any[]) => T
}

export const partialValidator = <T extends z.ZodRawShape>(
  schema: z.ZodObject<T, any>
): Parsable<Partial<T>> => schema.partial().strict() as Parsable<Partial<T>>
