import {Query} from "server/query"
import {Condition, evalCondition} from "../condition"
import {DbMethods, HasId} from "../server"
import {NotFoundError} from "../server/errorHandling"
import {DEFAULT_LIMIT, MAX_LIMIT} from "../condition/conditionSchema"

const fs = require("node:fs")
export class LocalCollection<T extends HasId> implements DbMethods<T> {
  constructor(public items: T[], private file?: string) {}

  private persist() {
    if (this.file) {
      fs.writeFileSync(this.file, JSON.stringify(this.items, null, 2), "utf8")
    }
  }

  findOneById = async (id: string) => {
    const item = this.items.find((i) => i._id === id)
    if (!item) throw new NotFoundError(`item with id ${id} not found`)
    return item
  }

  findOne = async (filter: Condition<T>) => {
    const item = this.items.find((item) => evalCondition(item, filter))
    if (!item) throw new NotFoundError("item not found")
    return item
  }

  findMany = async (query: Query<T>) => {
    const condition = query.condition ?? {Always: true}

    // Ensure skip and limit are valid (defense in depth)
    const skip = Math.max(0, Math.floor(query.skip ?? 0))
    const limit = Math.max(
      1,
      Math.min(Math.floor(query.limit ?? DEFAULT_LIMIT), MAX_LIMIT)
    )

    let results = this.items.filter((x) => evalCondition(x, condition))

    // Apply sorting if specified
    if (query.sort && query.sort.length > 0) {
      results = results.sort((a, b) => {
        for (const {field, order} of query.sort!) {
          const aVal = a[field as keyof T]
          const bVal = b[field as keyof T]

          let comparison = 0
          if (aVal < bVal) comparison = -1
          else if (aVal > bVal) comparison = 1

          if (comparison !== 0) {
            return order === "desc" ? -comparison : comparison
          }
        }
        return 0
      })
    }

    return results.slice(skip, skip + limit)
  }

  insertOne = async (item: T) => {
    this.items.push(item)
    this.persist()
    return item
  }

  insertMany = async (items: T[]) => {
    this.items.push(...items)
    this.persist()
    return items
  }

  updateOne = async (id: string, update: Partial<T>) => {
    const idx = this.items.findIndex((i) => i._id === id)
    if (idx === -1) throw new NotFoundError(`item with id ${id} not found`)
    const updated = {...this.items[idx], ...update}
    this.items[idx] = updated
    this.persist()
    return updated
  }

  deleteOne = async (id: string) => {
    const idx = this.items.findIndex((i) => i._id === id)
    if (idx === -1) throw new NotFoundError(`item with id ${id} not found`)
    const [deleted] = this.items.splice(idx, 1)
    this.persist()
    return deleted
  }
}
