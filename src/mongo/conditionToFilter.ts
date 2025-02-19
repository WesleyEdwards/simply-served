import {Filter} from "mongodb"
import {Condition} from "../condition/condition"

export function conditionToFilter<T>(condition: Condition<T>): Filter<T> {
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
    return {
      $or: condition.Or.map((cond) => conditionToFilter(cond)) as any,
    }
  }

  if ("And" in condition) {
    return {$and: condition.And.map((cond) => conditionToFilter(cond)) as any}
  }

  if ("Always" in condition) {
    if (condition.Always) {
      return {}
    } else {
      throw new Error("Invalid 'always' condition. It must be true.")
    }
  }

  if ("ListAnyElement" in condition) {
    return conditionToFilter(condition.ListAnyElement) as any
  }

  if ("StringContains" in condition) {
    return {
      $regex: new RegExp(
        condition.StringContains.value,
        condition.StringContains.ignoreCase ? "i" : "g"
      ),
    }
  }

  for (const key in condition) {
    const value = condition[key]

    if (key === "Equal" || key === "Or" || key === "And" || key === "Always") {
      continue
    }

    if (value && typeof value === "object") {
      return {
        [key]: conditionToFilter(value),
      } as any
    }
  }

  throw new Error("Invalid condition")
}
