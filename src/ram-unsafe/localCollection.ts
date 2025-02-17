import {Condition, evalCondition, Query} from "../condition"
import {DbMethods, HasId} from "../server"
import {NotFoundError} from "../server/errorHandling"
export class LocalCollection<T extends HasId> implements DbMethods<T> {
  constructor(public items: T[]) {}

  findOneById = async (id: string): Promise<T> => {
    const item = this.items.find((i) => i._id === id)
    if (item) {
      return item
    }
    throw new NotFoundError(`item with id ${id} not found`)
  }

  findOne = async (filter: Condition<T>): Promise<T> => {
    const filtered = this.items.filter((item) => evalCondition(item, filter))

    const res = filtered.at(0)
    if (res) {
      return res
    }
    throw new NotFoundError(`item not found`)
  }
  findMany = async (query: Query<T>): Promise<T[]> => {
    const filtered = this.items.filter((item) =>
      evalCondition(item, query.condition ?? {Always: true})
    )
    return filtered.slice(0, query.limit ?? 100)
  }
  insertOne = async (item: T) => {
    this.items = this.items.concat(item)
    return item
  }
  insertMany = async (items: T[]) => {
    this.items = this.items.concat(items)
    return items
  }
  updateOne = async (id: string, update: Partial<T>): Promise<T> => {
    const old = this.items.find((i) => i._id === id)
    if (!old) {
      throw new NotFoundError(`item with id ${id} not found`)
    }
    const modified = {...old, ...update}
    this.items = [
      ...this.items.map((item) => (item._id === old._id ? modified : item)),
    ]
    return modified
  }
  deleteOne = async (id: string): Promise<T> => {
    const old = this.items.find((i) => i._id === id)
    this.items = [...this.items.filter((i) => i._id !== id)]
    if (!old) throw new NotFoundError(`item with id ${id} not found`)
    return old
  }
}
