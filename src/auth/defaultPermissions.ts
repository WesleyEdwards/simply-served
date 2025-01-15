import {ModelPermissions} from "../server"

export const alwaysAllowed = <Ctx, T>(): ModelPermissions<Ctx, T> => ({
  read: () => ({Always: true}),
  delete: () => ({Always: true}),
  create: () => ({Always: true}),
  modify: () => ({Always: true})
})
