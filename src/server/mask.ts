import {ServerContext} from "./simpleServer"

/**
 * keys with the value of 'true' will be masked. Any key not included or any 
 * value that is false will not mask that key
 * 
 * Example: {passwordHash: true}
 */
type KeysToMask<T> = Partial<Record<keyof T, boolean>>

/**
 *
 * @param getFieldsToMask a function that determines which keys should be masked
 * @returns a function that masks certain keys of T
 */
export const maskKeysBasedOnPerms = <T extends {}, Ctx extends ServerContext>(
  getFieldsToMask: (item: T, ctx: Ctx) => KeysToMask<T>
): ((items: T, clients: Ctx) => T) => {
  const prepareRes = (item: T, ctx: Ctx) => {
    const toMask = getFieldsToMask(item, ctx)
    const newObj = Object.entries(item).reduce<T>((acc, [key, value]) => {
      if (key in toMask) {
        if ((toMask as any)[key]) {
          return acc
        }
      }
      // @ts-ignore
      acc[key] = value
      return acc
    }, {} as T)
    return newObj
  }
  return prepareRes
}
