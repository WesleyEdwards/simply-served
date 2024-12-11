export const maskKeys = <T extends {}>(maskKeys: (keyof T)[]) => {
  const prepareRes = (item: T) => {
    for (const key of maskKeys) {
      delete item[key]
    }
    return item
  }
  return prepareRes
}
