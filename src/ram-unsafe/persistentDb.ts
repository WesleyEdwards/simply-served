import {DbQueries} from "../server"
import {DataStore} from "./DataStore"

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
export const persistentDb = <In extends Record<string, any[]>>(
  dbDef: In,
  dbPath?: string
): {[K in keyof In]: DbQueries<In[K][number]>} => {
  const db = {} as {[K in keyof In]: DbQueries<In[K][number]>}

  const path = dbPath ?? "./db-store"

  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, {recursive: true})
  }

  for (const [key, defaultItems] of Object.entries(dbDef)) {
    const file = `${path}/${key}.json`

    const handler: ProxyHandler<DataStore<any>> = {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver)
        if (typeof value === "function") {
          return (...args: any[]) => {
            const result = value.apply(target, args)
            if (
              ["insertOne", "updateOne", "deleteOne"].includes(prop as string)
            ) {
              const json = JSON.stringify(target.items)
              fs.writeFile(file, json, "utf8", (err: any) => {
                console.error(err)
              })
            }
            return result
          }
        }
        return value
      },
    }

    let parsed: any = defaultItems
    if (fs.existsSync(file)) {
      try {
        const data = fs.readFileSync(file, "utf8")
        parsed = JSON.parse(data)
      } catch (err) {
        console.error(`Error parsing JSON from ${file}:`, err)
      }
    }

    const collection = new DataStore(parsed)
    const proxy = new Proxy(collection, handler as any)
    // @ts-ignore
    db[key] = proxy
  }

  return db
}
