import {Condition, evalCondition} from "../condition"
import {HasId, MaybeError} from "../server"

export class DataStore<T extends HasId> {
  constructor(public items: T[]) {}
  findOne = async (filter: Condition<T>): Promise<MaybeError<T>> => {
    const filtered = this.items.filter((item) => evalCondition(item, filter))

    const res = filtered.at(0)
    if (res) {
      return {success: true, data: res}
    }
    return {
      success: false,
      error: "Not found"
    }
  }
  findMany = async (filter: Condition<T>): Promise<T[]> => {
    const filtered = this.items.filter((item) => evalCondition(item, filter))
    return filtered
  }
  insertOne = async (item: T) => {
    this.items = this.items.concat(item)
    console.log("Inserted", item)
    return {success: true, data: item} as const
  }
  updateOne = async (
    id: string,
    update: Partial<T>
  ): Promise<MaybeError<T>> => {
    const old = this.items.find((i) => i._id === id)
    if (!old) return {success: false, error: "Not found"}
    const modified = {...old, ...update}
    this.items = [
      ...this.items.map((item) => (item._id === old._id ? modified : item))
    ]
    console.log("Updated", this.items)
    return {success: true, data: modified}
  }
  deleteOne = async (id: string): Promise<T> => {
    const old = this.items.find((i) => i._id === id)
    this.items = [...this.items.filter((i) => i._id !== id)]
    if (!old) throw new Error("Not found")
    return old
  }
}
