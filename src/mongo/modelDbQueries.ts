import {Collection, Filter, OptionalUnlessRequiredId} from "mongodb"
import {DbQueries, HasId} from "../server/DbClient"
import {conditionToFilter} from "./conditionToFilter"
import {Condition} from "condition"

/**
 *
 * @param db Mongo Db
 * @param collectionPath Path to the model collection
 * @returns Functions for safely reading and manipulating model data
 */
export function modelDbQueries<T extends HasId>(
  db: any,
  collectionPath: string
): DbQueries<T> {
  const collection: Collection<T> = db.collection(collectionPath)

  return {
    insertOne: async (newItem: T) => {
      const {acknowledged} = await collection.insertOne(
        newItem as OptionalUnlessRequiredId<T>
      )
      if (acknowledged) {
        return {success: true, data: newItem}
      }
      return {success: false, error: "Unknown error"}
    },
    findOne: async (filter) => {
      const item = (await collection.findOne(
        conditionToFilter(filter)
      )) as T | null
      if (item) {
        return {success: true, data: item}
      }
      return {success: false, error: "unable to find Item"}
    },
    findMany: async (filter: Condition<T>) => {
      const items = collection.find(conditionToFilter(filter))
      return (await items.toArray()) as T[]
    },
    updateOne: async (id, item) => {
      const value = await collection.findOneAndUpdate(
        {_id: id} as Filter<T>,
        {$set: item},
        {returnDocument: "after"}
      )
      if (!value) {
        return {success: false, error: "unable to find item"}
      }
      return {success: true, data: value as T}
    },
    deleteOne: async (id, condition) => {
      const c: Filter<T> = condition
        ? conditionToFilter({
            And: [{_id: {Equal: id}}, condition]
          } as Condition<T>)
        : conditionToFilter({_id: {Equal: id}} as Condition<T>)

      const item = await collection.findOneAndDelete(c)
      if (!item) {
        throw new Error("Item not found")
      }
      return item as T
    }
  }
}
