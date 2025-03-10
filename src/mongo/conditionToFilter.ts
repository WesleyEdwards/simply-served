import {Filter} from "mongodb"
import {Condition} from "../condition/condition"

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
      $or: condition.Or.map((cond) => conditionToFilter(cond)) as any,
    }
  }
  if ("And" in condition) {
    return {$and: condition.And.map((cond) => conditionToFilter(cond)) as any}
  }

  if ("GreaterThan" in condition) {
    return {
      $gt: condition.GreaterThan as any,
    }
  }
  if ("GreaterThanOrEqual" in condition) {
    return {
      $gte: condition.GreaterThanOrEqual as any,
    }
  }

  if ("LessThan" in condition) {
    return {
      $lt: condition.LessThan as any,
    }
  }
  if ("LessThanOrEqual" in condition) {
    return {
      $lte: condition.LessThanOrEqual as any,
    }
  }

  if ("Always" in condition) {
    if (condition.Always) {
      return {}
    } else {
      throw new Error("Invalid 'always' condition. It must be true.")
    }
  }

  if ("ListAnyElement" in condition) {
    return {$elemMatch: conditionToFilter(condition.ListAnyElement)}
  }

  if ("StringContains" in condition) {
    return {
      $regex: new RegExp(
        condition.StringContains.value,
        condition.StringContains.ignoreCase ? "i" : "g"
      ),
    }
  }

  const nested = extractNestedKey(condition)

  if ("And" in nested.condition) {
    return {
      $and: nested.condition.And.map((cond) => ({
        [nested.key]: conditionToFilter(cond),
      })),
    } as any
  }
  if ("Or" in nested.condition) {
    return {
      $or: nested.condition.Or.map((cond) => ({
        [nested.key]: conditionToFilter(cond),
      })),
    } as any
  }

  return {[nested.key]: conditionToFilter(nested.condition)} as any
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

      if (contitionStrs.includes(nestedKey)) {
        return {key: keyString, condition}
      }

      const strToAdd = keyString === "" ? nestedKey : `.${nestedKey}`

      keyString += strToAdd

      condition = nestedValue
    }
  }
}

const contitionStrs = [
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
