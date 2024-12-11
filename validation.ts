import {z, ZodIssue, ZodObject, ZodRawShape} from "zod"
import {v4 as uuidv4} from "uuid"

const baseObjectSchema = z.object({
  _id: z.string().uuid().default(uuidv4)
})

export const createDbObject = <T extends ZodRawShape>(
  fun: (zod: typeof z) => ZodObject<T>
) => fun(z).merge(baseObjectSchema)

export const createSchema = <T extends ZodRawShape>(
  fun: (zod: typeof z) => ZodObject<T>
) => fun(z)

export type ParseError = {error: Partial<ZodIssue>}

export type SafeParsable<T> = {
  safeParse: (
    obj: any
  ) => {success: true; data: T} | {success: false; error: any}
}

export function checkValidSchema<T>(
  body: any,
  schema: SafeParsable<T>
): T | ParseError {
  const result = schema.safeParse(body)
  if (result.success) return result.data
  return {error: result.error?.issues?.at(0) ?? {message: "Unknown error"}}
}

export function isParseError<T extends object>(
  body: T | {error: any}
): body is ParseError {
  return "error" in body
}

export function checkPartialValidation<T>(
  body: any,
  schema: ZodObject<any, any, any, T>
): Partial<T> | ParseError {
  const result = schema.partial().safeParse(body)

  return result.success
    ? (result.data as Partial<T>)
    : {error: result.error?.issues?.at(0) ?? {message: "Unknown error"}}
}

export function isValid<T>(body: any): body is T {
  return !("error" in body)
}
