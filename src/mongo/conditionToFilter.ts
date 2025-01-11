import {Filter} from "mongodb"
import {Condition} from "../condition/condition"

export function conditionToFilter<T>(condition: Condition<T>): Filter<T> {
  const acc: Filter<T> = {}

  if ("Equal" in condition) {
    return condition.Equal as Filter<T>
  }
  if ("Inside" in condition) {
    return {$in: condition.Inside} as Filter<T>
  }
  if ("Never" in condition) {
    return {_id: false} as Filter<T>
  }
  if ("Or" in condition) {
    acc.$or = condition.Or.map((cond) => conditionToFilter(cond)) as any
    return acc
  }

  if ("And" in condition) {
    acc.$and = condition.And.map((cond) => conditionToFilter(cond)) as any
    return acc
  }

  if ("Always" in condition) {
    if (condition.Always) {
      return acc
    } else {
      throw new Error("Invalid 'always' condition. It must be true.")
    }
  }

  if ("ListAnyElement" in condition) {
    return conditionToFilter(condition.ListAnyElement) as any
  }

  for (const key in condition) {
    const value = condition[key]

    if (key === "Equal" || key === "Or" || key === "And" || key === "Always") {
      continue
    }

    if (value && typeof value === "object") {
      acc[key as keyof Filter<T>] = conditionToFilter(value as any)
    }
  }

  return acc
}
