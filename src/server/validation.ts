import {z, ZodIssue, ZodObject} from "zod"
import {v4 as uuidv4} from "uuid"
import {MaybeError} from "./DbClient"
import {InvalidRequestError} from "./errorHandling"

export const baseObjectSchema = z.object({
  _id: z.string().uuid().default(uuidv4),
})

export type ParseError = {error: Partial<ZodIssue>}

export type SafeParsable<T> = {
  safeParse: (obj: any) => MaybeError<T>
}

export function checkValidSchema<T>(body: any, schema: SafeParsable<T>): T {
  const result = schema.safeParse(body)
  if (result.success) return result.data
  throw new InvalidRequestError(
    result.error?.issues?.at(0) ?? "Error parsing body"
  )
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
      message: "Unknown error in checkPartialValidation",
    },
  }
}

export function isValid<T>(body: any): body is T {
  return !("error" in body)
}
