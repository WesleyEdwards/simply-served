import {DbMethods} from "../server"
import {LocalCollection} from "./localCollection"

const fs = require("node:fs")

/**
 * This function creates a local 'database' that will save files locally in json format.
 * @param dbDef Each Db collection with a list of default items if there are no existing files yet.
 *
 * @param dbPath A path to indicate where to store files
 * @default "./db-store"
 *
 * @returns a Db that will save to local files
 */

export const persistentDb = <T extends Record<string, any>>(
  dbPath = "./db-store"
) => {
  if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath, {recursive: true})

  const cache: Record<string, LocalCollection<any>> = {}

  const handler: ProxyHandler<any> = {
    get(_, prop: string) {
      if (typeof prop !== "string") return undefined

      if (!cache[prop]) {
        const file = `${dbPath}/${prop}.json`
        let items: any[] = []
        if (fs.existsSync(file)) {
          try {
            items = JSON.parse(fs.readFileSync(file, "utf8"))
          } catch (err) {
            console.error(`Error parsing ${file}:`, err)
          }
        }
        cache[prop] = new LocalCollection(items, file)
      }
      return cache[prop]
    }
  }

  return new Proxy({}, handler) as {[K in keyof T]: DbMethods<T[K]>}
}
