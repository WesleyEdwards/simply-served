import {DbMethods} from "../server"
import {LocalCollection} from "./localCollection"

/**
 * Creates an in-memory database with lazy collection initialization.
 * Collections are created on first access and exist only in memory.
 *
 * @param initialData Optional initial data for collections.
 * Each key is a collection name, and the value is an array of items.
 *
 * @returns A database object where each property is a DbMethods collection
 *
 * @example
 * // Empty database with lazy collection creation
 * const db = inMemoryDb<{users: User, posts: Post}>()
 * await db.users.insertOne({_id: "1", name: "John"})
 *
 * @example
 * // Database with initial data
 * const db = inMemoryDb<{users: User}>({
 *   users: [{_id: "1", name: "John"}]
 * })
 */
export const inMemoryDb = <T extends Record<string, any>>(
  initialData?: Partial<{[K in keyof T]: T[K][]}>
) => {
  const cache: Record<string, LocalCollection<any>> = {}

  const handler: ProxyHandler<any> = {
    get(_, prop: string) {
      if (typeof prop !== "string") return undefined

      if (!cache[prop]) {
        const items = initialData?.[prop as keyof T] ?? []
        cache[prop] = new LocalCollection([...items])
      }
      return cache[prop]
    },
  }

  return new Proxy({}, handler) as {[K in keyof T]: DbMethods<T[K]>}
}
