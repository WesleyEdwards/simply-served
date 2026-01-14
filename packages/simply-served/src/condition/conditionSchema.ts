import {z, ZodType} from "zod"

/** Default maximum limit for queries to prevent DoS attacks */
export const MAX_LIMIT = 10000
export const DEFAULT_LIMIT = 100

export const createCountSchema = <T>(schema: z.ZodType<T, any, any>) => {
  return z.object({
    condition: createConditionSchema(schema).optional(),
  })
}

export const createQuerySchema = <T>(
  schema: z.ZodType<T, any, any>,
  options?: {maxLimit?: number}
) => {
  const maxLimit = options?.maxLimit ?? MAX_LIMIT

  // Extract valid field names from schema for sort validation
  const validFields =
    schema instanceof z.ZodObject ? Object.keys(schema.shape) : []

  const sortSchema = z
    .array(
      z.object({
        field: validFields.length > 0
          ? z.enum(validFields as [string, ...string[]])
          : z.string(),
        order: z.enum(["asc", "desc"]),
      })
    )
    .optional()

  return z.object({
    limit: z
      .number()
      .int("Limit must be an integer")
      .min(1, "Limit must be at least 1")
      .max(maxLimit, `Limit cannot exceed ${maxLimit}`)
      .optional(),
    skip: z
      .number()
      .int("Skip must be an integer")
      .min(0, "Skip cannot be negative")
      .optional(),
    condition: createConditionSchema(schema).optional(),
    sort: sortSchema,
  })
}

export function createConditionSchema<T extends ZodType>(
  base: T
): z.ZodTypeAny {
  const variants: z.ZodTypeAny[] = []

  variants.push(z.object({Always: z.literal(true)}))
  variants.push(z.object({Never: z.literal(true)}))

  variants.push(z.object({Equal: base}))
  variants.push(z.object({NotEqual: base}))
  variants.push(z.object({GreaterThan: base}))
  variants.push(z.object({GreaterThanOrEqual: base}))
  variants.push(z.object({LessThan: base}))
  variants.push(z.object({LessThanOrEqual: base}))

  variants.push(z.object({Inside: z.array(base)}))

  const lazyCondition = z.lazy(() => createConditionSchema(base))
  variants.push(z.object({Or: z.array(lazyCondition)}))
  variants.push(z.object({And: z.array(lazyCondition)}))

  if (base instanceof z.ZodArray) {
    variants.push(
      z.object({
        ListAnyElement: z.lazy(() =>
          createConditionSchema(base.element as any)
        ),
      })
    )
  }

  if (base.def.type === "string") {
    variants.push(
      z.object({
        StringContains: z.object({
          value: z.string(),
          ignoreCase: z.boolean(),
        }),
      })
    )
  }

  if (base instanceof z.ZodObject) {
    const shape = base.shape
    const nestedShape: Record<string, z.ZodTypeAny> = {}
    for (const key in shape) {
      nestedShape[key] = z.lazy(() => createConditionSchema(base.shape[key]))
    }
    variants.push(z.object(nestedShape).partial())
  }

  return z.union(variants).refine((arg) => {
    // When it gets parsed out, throw an error if it's an empty object
    if (typeof arg === "object" && arg !== null) {
      if (Object.keys(arg).length === 0) {
        throw Error("Invalid condition")
      }
    }
    return arg
  })
}
