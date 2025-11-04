import {
  Collection,
  Filter,
  OptionalUnlessRequiredId,
  Db,
  FindOptions,
} from "mongodb"
import {HasId, DbMethods} from "../server/DbMethods"
import {conditionToFilter} from "./conditionToFilter"
import {Condition, Query} from "../condition"
import {InternalServerError, NotFoundError} from "../server"
// const { inspect } = require('node:util');

/**
 * @param db Mongo Db
 * @param collectionPath Path to the model collection
 * @returns Functions for reading and manipulating model data
 */
export function mongoQueries<T extends HasId>(
  db: Db,
  collectionPath: string
): DbMethods<T> {
  const collection: Collection<T> = db.collection(collectionPath)

  return {
    findOneById: async (id: string): Promise<T> => {
      const item = await collection.findOne({
        _id: id,
      } as Filter<T>)
      if (!item) {
        throw new NotFoundError(`item with id ${id} not found`)
      }
      return item as T
    },
    findOne: async (filter: Condition<T>): Promise<T> => {
      const item = await collection.findOne(conditionToFilter(filter))
      if (item) {
        return item as T
      }
      throw new NotFoundError(
        `No item satisfying condition ${filter} could be found`
      )
    },
    findMany: async (query: Query<T>): Promise<T[]> => {
      const filter = query.condition ? conditionToFilter(query.condition) : {}
      const options: FindOptions<T> = {
        limit: query.limit ?? 100,
        skip: query.skip ?? 0,
      }
      try {
        // console.log(inspect(filter, {depth: null}))
        const items = collection.find(filter, options)
        return (await items.toArray()) as T[]
      } catch (e: unknown) {
        const errorMessage =
          e instanceof Error ? e.message : "Unknown error occurred"
        throw new InternalServerError(errorMessage)
      }
    },
    insertOne: async (newItem: T): Promise<T> => {
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
    insertMany: async (items: T[]): Promise<T[]> => {
      const {acknowledged} = await collection.insertMany(
        items as OptionalUnlessRequiredId<T>[]
      )
      if (acknowledged) {
        return items
      }
      throw new InternalServerError(`Unable to insert ${items.length} items`)
    },
    updateOne: async (id: string, item: Partial<T>): Promise<T> => {
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
    deleteOne: async (id: string): Promise<T> => {
      const filter: Filter<T> = conditionToFilter({
        _id: {Equal: id},
      } as Condition<T>)

      const item = await collection.findOneAndDelete(filter)
      if (!item) {
        throw new InternalServerError("Unable to delete item")
      }
      return item as T
    },
  }
}
