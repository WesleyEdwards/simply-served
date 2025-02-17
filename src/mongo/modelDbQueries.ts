import {Collection, Filter, OptionalUnlessRequiredId} from "mongodb"
import {HasId, DbMethods} from "../server/DbMethods"
import {conditionToFilter} from "./conditionToFilter"
import {Condition} from "../condition"
import {InternalServerError, NotFoundError} from "../server"

/**
 * @param db Mongo Db
 * @param collectionPath Path to the model collection
 * @returns Functions for reading and manipulating model data
 */
export function mongoQueries<T extends HasId>(
  db: any,
  collectionPath: string
): DbMethods<T> {
  const collection: Collection<T> = db.collection(collectionPath)

  return {
    findOneById: async (id: string) => {
      const item = (await collection.findOne({
        _id: id,
      } as Filter<T>)) as T | null
      if (!item) {
        throw new NotFoundError(`item with id ${id} not found`)
      }
      return item
    },
    findOne: async (filter) => {
      const item = (await collection.findOne(
        conditionToFilter(filter)
      )) as T | null
      if (item) {
        return item
      }
      throw new NotFoundError(
        `No item satisfying condition ${filter} could be found`
      )
    },
    findMany: async (filter: Condition<T>) => {
      const items = collection.find(conditionToFilter(filter))
      return (await items.toArray()) as T[]
    },
    insertOne: async (newItem: T) => {
      const {acknowledged} = await collection.insertOne(
        newItem as OptionalUnlessRequiredId<T>
      )
      if (acknowledged) {
        return newItem
      }

      throw new InternalServerError(
        `Unable to insert item with ${newItem._id} ID`
      )
    },
    insertMany: async (items) => {
      const {acknowledged} = await collection.insertMany(
        items as OptionalUnlessRequiredId<T>[]
      )
      if (acknowledged) {
        return items
      }
      throw new InternalServerError(`Unable to insert ${items.length} items`)
    },
    updateOne: async (id, item) => {
      const value = await collection.findOneAndUpdate(
        {_id: id} as Filter<T>,
        {$set: item},
        {returnDocument: "after"}
      )
      if (!value) {
        throw new InternalServerError("Unable to update item")
      }
      return value as T
    },
    deleteOne: async (id) => {
      const c: Filter<T> = conditionToFilter({_id: {Equal: id}} as Condition<T>)

      const item = await collection.findOneAndDelete(c)
      if (!item) {
        throw new InternalServerError("Unable to delete item")
      }
      return item as T
    },
  }
}
