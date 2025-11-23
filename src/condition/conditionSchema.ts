import {z, ZodType} from "zod"

export const createQuerySchema = <T>(schema: z.ZodType<T, any, any>) =>
  z.object({
    limit: z.number().optional(),
    skip: z.number().optional(),
    condition: createConditionSchema(schema),
  })

export function createConditionSchema<T extends ZodType>(
  base: T
): z.ZodTypeAny {
  const variants: z.ZodTypeAny[] = []

  variants.push(z.object({Always: z.literal(true)}))
  variants.push(z.object({Never: z.literal(true)}))

  variants.push(z.object({Equal: base}))
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
