import {Filter} from "mongodb"
import {Condition} from "../condition/condition"

/** Escapes special regex characters to prevent regex injection */
const escapeRegex = (str: string): string =>
  str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

export function conditionToFilter<T>(condition: Condition<T>): Filter<T> {
  if ("Equal" in condition) {
    return {$eq: condition.Equal} as Filter<T>
  }
  if ("Inside" in condition) {
    return {$in: condition.Inside} as Filter<T>
  }
  if ("Never" in condition) {
    return {_id: false} as Filter<T>
  }
  if ("Or" in condition) {
    return {
      $or: condition.Or.map((cond) => conditionToFilter(cond)),
    } as Filter<T>
  }
  if ("And" in condition) {
    return {$and: condition.And.map((cond) => conditionToFilter(cond))} as Filter<T>
  }

  if ("GreaterThan" in condition) {
    return {
      $gt: condition.GreaterThan,
    } as Filter<T>
  }
  if ("GreaterThanOrEqual" in condition) {
    return {
      $gte: condition.GreaterThanOrEqual,
    } as Filter<T>
  }

  if ("LessThan" in condition) {
    return {
      $lt: condition.LessThan,
    } as Filter<T>
  }
  if ("LessThanOrEqual" in condition) {
    return {
      $lte: condition.LessThanOrEqual,
    } as Filter<T>
  }

  if ("Always" in condition) {
    if (condition.Always) {
      return {}
    } else {
      throw new Error("Invalid 'always' condition. It must be true.")
    }
  }

  if ("ListAnyElement" in condition) {
    return {$elemMatch: conditionToFilter(condition.ListAnyElement)} as Filter<T>
  }

  if ("StringContains" in condition) {
    // Escape special regex characters to prevent injection
    const escapedValue = escapeRegex(condition.StringContains.value)
    return {
      $regex: escapedValue,
      ...(condition.StringContains.ignoreCase && {$options: "i"}),
    } as Filter<T>
  }

  const nested = extractNestedKey(condition)

  if ("And" in nested.condition) {
    return {
      $and: nested.condition.And.map((cond) => ({
        [nested.key]: conditionToFilter(cond),
      })),
    } as Filter<T>
  }
  if ("Or" in nested.condition) {
    return {
      $or: nested.condition.Or.map((cond) => ({
        [nested.key]: conditionToFilter(cond),
      })),
    } as Filter<T>
  }

  return {[nested.key]: conditionToFilter(nested.condition)} as Filter<T>
}

const extractNestedKey = <T>(
  c: Condition<T>
): {key: string; condition: Condition<T>} => {
  let keyString = ""
  let condition = c

  while (true) {
    if (typeof condition === "object" && condition !== null) {
      const nestedKeyValue = Object.entries(condition).at(0)
      if (!nestedKeyValue) {
        return {key: keyString, condition}
      }
      const [nestedKey, nestedValue] = nestedKeyValue

      if (conditionStrs.includes(nestedKey)) {
        return {key: keyString, condition}
      }

      const strToAdd = keyString === "" ? nestedKey : `.${nestedKey}`

      keyString += strToAdd

      condition = nestedValue
    }
  }
}

const conditionStrs = [
  "Always",
  "Never",
  "Equal",
  "GreaterThan",
  "GreaterThanOrEqual",
  "LessThan",
  "LessThanOrEqual",
  "Inside",
  "Or",
  "And",
  "ListAnyElement",
  "StringContains",
]
