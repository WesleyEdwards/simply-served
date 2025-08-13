import {Express} from "express"
import z from "zod"

export type MetaInfo =
  | {
      type: "endpoint"
      name: string
      args: Record<string, string>
      body?: z.ZodSchema<any, any, any>
      method: string
      returnType: string
    }
  | {
      type: "model"
      schema: z.ZodSchema<any, any, any>
    }

export function addMetaInfo(app: Express, info: MetaInfo[]) {
  const a = app as Express & {_meta?: MetaInfo[]}
  if (a._meta) {
    a._meta.push(...info)
  } else {
    a._meta = [...info]
  }
}
