import {z, ZodIssue, ZodObject, ZodRawShape} from "zod"
import {v4 as uuidv4} from "uuid"
import {MaybeError} from "./DbClient"

export const baseObjectSchema = z.object({
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
  safeParse: (obj: any) => MaybeError<T>
}

export function checkValidSchema<T>(
  body: any,
  schema: SafeParsable<T>
): T | ParseError {
  const result = schema.safeParse(body)
  if (result.success) return result.data
  return {
    error: result.error?.issues?.at(0) ?? {
      message: "Unknown error in checkValidSchema"
    }
  }
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

  if (result.success) {
    return result.data as Partial<T>
  }
  return {
    error: result.error?.issues?.at(0) ?? {
      message: "Unknown error in checkPartialValidation"
    }
  }
}

export function isValid<T>(body: any): body is T {
  return !("error" in body)
}
