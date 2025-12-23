import {Condition} from "./types"

export function evalCondition<T>(item: T, condition: Condition<T>): boolean {
  if ("Never" in condition) {
    return false
  }

  if ("Always" in condition) {
    return true
  }

  if ("Equal" in condition) {
    return condition.Equal === item
  }

  if ("GreaterThan" in condition) {
    return item > condition.GreaterThan
  }
  if ("GreaterThanOrEqual" in condition) {
    return item >= condition.GreaterThanOrEqual
  }

  if ("LessThan" in condition) {
    return item < condition.LessThan
  }
  if ("LessThanOrEqual" in condition) {
    return item <= condition.LessThanOrEqual
  }

  if ("Inside" in condition) {
    return condition.Inside.some((i) => areEqual(item, i))
  }

  if ("Or" in condition) {
    return condition.Or.some((orCondition) => evalCondition(item, orCondition))
  }

  if ("And" in condition) {
    return condition.And.every((andCondition) =>
      evalCondition(item, andCondition)
    )
  }
  if ("ListAnyElement" in condition) {
    if (!Array.isArray(item)) throw new Error("Invalid condition")
    return item.some((value) => evalCondition(value, condition.ListAnyElement))
  }
  if ("StringContains" in condition) {
    if (typeof item === "string") {
      if (condition.StringContains.ignoreCase) {
        return item
          .toLowerCase()
          .includes(condition.StringContains.value.toLowerCase())
      } else {
        return item.includes(condition.StringContains.value)
      }
    }
  }

  if (
    typeof item === "object" &&
    typeof condition === "object" &&
    item !== null
  ) {
    return Object.entries(condition).every(([key, subCondition]) => {
      const itemValue = (item as any)[key]
      return (
        itemValue !== undefined &&
        evalCondition(itemValue, subCondition as Condition<any>)
      )
    })
  }

  return false
}

const areEqual = (a: any, b: any): boolean => {
  if (typeof a !== typeof b) return false
  if (typeof a === "object") {
    return JSON.stringify(a) === JSON.stringify(b)
  }
  return a === b
}
