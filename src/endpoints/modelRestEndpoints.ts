import {Route} from "../server/controller"
import {DbMethods, HasId} from "../server/DbMethods"
import {Condition} from "../condition/condition"
import {AuthPath, buildRouteRaw, Path} from "./buildRoute"
import {createQuerySchema} from "../condition/conditionSchema"
import {ZodType} from "zod"
import {partialValidator} from "../server"
import {evalCondition} from "../condition"
import {ServerContext} from "../types"

export type BuilderParams<C extends ServerContext, T extends HasId> = {
  validator: ZodType<T, any, any>
  collection: (clients: C["db"]) => DbMethods<T>
  permissions: ModelPermissions<C, T>
  actions?: ModelActions<C, T>
}

export type ModelPermissions<C extends ServerContext, T> = {
  read: ModelPermOption<C, T>
  delete: ModelPermOption<C, T>
  create: ModelPermOption<C, T>
  modify: ModelPermOption<C, T>
}

/**
 * Permissions
 * 'publicAccess' - No authentication is required
 * 'authenticated' - Permission granted to any authenticated user
 * 'modelAuth' - Permission granted based on the Condition provided through 'check'
 * 'notAllowed' - Permission is Not granted to anyone
 */
export type ModelPermOption<C extends ServerContext, T> =
  | {type: "publicAccess"}
  | {type: "authenticated"}
  | {type: "modelAuth"; check: (auth: C["auth"]) => Condition<T>}
  | {type: "notAllowed"}

export type ModelActions<S, T> = {
  prepareResponse?: (items: T, clients: S) => T
  interceptCreate?: (item: T, clients: S) => Promise<T>
  postCreate?: (item: T, clients: S) => Promise<unknown>
  interceptModify?: (
    item: T,
    mod: Partial<T>,
    clients: S
  ) => Promise<Partial<T>>
  postModify?: (item: T, clients: S) => Promise<unknown>
  interceptDelete?: (item: T, clients: S) => Promise<T>
  postDelete?: (item: T, clients: S) => Promise<unknown>
}

/**
 *
 * @param builderInfo Information for building rest endpoints, including:
 * Schema Validation
 * Getter for Db collection
 * Permissions
 * Server actions
 * @returns auto-generated endpoints
 *
 * @see {@link https://github.com/WesleyEdwards/simply-served/blob/main/docs/ModelRestEndpoints.md Model Rest Endpoints Docs}
 */
export function modelRestEndpoints<C extends ServerContext, T extends HasId>(
  builderInfo: BuilderParams<C, T>
): Route<C, any, any>[] {
  return [
    buildRouteRaw({
      route: {
        authPath: getAuthOptions(builderInfo.permissions.read, {
          type: "id",
          route: `/:id`,
        }),
        method: "get",
        fun: async ({req, res, ...rest}, auth) => {
          if (!req.params.id) {
            return res.status(400).json({error: "Provide a valid id"})
          }
          const id: string = req.params.id
          const client = {...rest, auth} as unknown as C
          if (!id || typeof id !== "string") {
            return res.status(400).json("Id required")
          }

          try {
            const item = await builderInfo.collection(client.db).findOne({
              And: [
                {_id: {Equal: id}},
                getItemCondition(builderInfo.permissions.read, client),
              ],
            })
            return res.json(
              builderInfo.actions?.prepareResponse?.(item, client) ?? item
            )
          } catch {
            return res.status(404).json({message: "Not Found"})
          }
        },
      },
    }),
    buildRouteRaw({
      route: {
        authPath: getAuthOptions(builderInfo.permissions.read, {
          type: "route",
          route: `/query`,
        }),
        method: "post",
        fun: async ({req, res, ...rest}, auth) => {
          const client = {...rest, auth} as unknown as C
          const items = await builderInfo.collection(client.db).findMany({
            condition: {
              And: [
                req.body.condition ?? {Always: true},
                getItemCondition(builderInfo.permissions.read, client),
              ],
            },
            limit: req.body.limit,
          })

          if (builderInfo.actions?.prepareResponse) {
            return res.json(
              items.map((item) =>
                builderInfo.actions!.prepareResponse!(item, client)
              )
            )
          }
          return res.json(items)
        },
      },
      validator: createQuerySchema(builderInfo.validator),
    }),
    buildRouteRaw({
      route: {
        authPath: getAuthOptions(builderInfo.permissions.create, {
          type: "route",
          route: "/insert",
        }),
        method: "post",
        fun: async ({req, res, ...rest}, auth) => {
          const client = {...rest, auth} as unknown as C
          const {body} = req

          const canCreate = evalCondition(
            body,
            getItemCondition(builderInfo.permissions.create, client)
          )

          if (!canCreate) {
            return res.status(401).json({error: "Cannot create"})
          }

          const processed = builderInfo.actions?.interceptCreate
            ? await builderInfo.actions.interceptCreate(body, client)
            : body

          try {
            const created = await builderInfo
              .collection(client.db)
              .insertOne(processed)
            await builderInfo.actions?.postCreate?.(created, client)
            return res.json(
              builderInfo.actions?.prepareResponse?.(created, client) ?? created
            )
          } catch {
            return res.status(500).json({error: "Unable to create item"})
          }
        },
      },
    }),
    buildRouteRaw({
      route: {
        method: "put",
        authPath: getAuthOptions(builderInfo.permissions.modify, {
          type: "route",
          route: "/:id",
        }),
        fun: async ({req, res, ...rest}, auth) => {
          const {body} = req
          const client = {...rest, auth} as unknown as C

          if (!req.params.id) {
            return res.status(400).json({error: "Provide a valid id"})
          }
          const id: string = req.params.id

          const item = await builderInfo.collection(client.db).findOne({
            And: [
              {_id: {Equal: id}},
              getItemCondition(builderInfo.permissions.modify, client),
            ],
          })
          const intercepted =
            (await builderInfo.actions?.interceptModify?.(
              item,
              body,
              client
            )) ?? body

          const updated = await builderInfo
            .collection(client.db)
            .updateOne(id, intercepted)

          await builderInfo.actions?.postModify?.(updated, client)

          return res.json(
            builderInfo.actions?.prepareResponse?.(updated, client) ?? updated
          )
        },
      },
      validator: partialValidator(builderInfo.validator),
    }),
    buildRouteRaw({
      route: {
        method: "delete",
        authPath: getAuthOptions(builderInfo.permissions.delete, {
          route: "/:id",
          type: "id",
        }),
        fun: async ({req, res, ...rest}, auth) => {
          const client = {...rest, auth} as unknown as C

          if (!req.params.id) {
            return res.status(400).json({error: "Provide a valid id"})
          }
          const item = await builderInfo.collection(client.db).findOne({
            And: [
              {_id: {Equal: req.params.id}},
              getItemCondition(builderInfo.permissions.delete, client),
            ],
          })
          await builderInfo.actions?.interceptDelete?.(item, client)

          const deleted = await builderInfo
            .collection(client.db)
            .deleteOne(req.params.id)

          await builderInfo.actions?.postDelete?.(deleted, client)
          return res.json(deleted._id)
        },
      },
    }),
  ]
}

// Can perform action on item
const getItemCondition = <C extends ServerContext, T extends HasId>(
  perms: ModelPermOption<C, T>,
  clients: C
): Condition<T> => {
  if (perms.type === "notAllowed") {
    return {Never: true}
  }
  if (perms.type === "publicAccess") {
    return {Always: true}
  }
  if (perms.type === "authenticated") {
    return {Always: true}
  }
  return perms.check(clients.auth)
}

/**
 * Determines whether the buildRoute.fun is authorized and accessible.
 * If modelAuth is provided, that'll be checked in 'getItemCondition'
 */
const getAuthOptions = <C extends ServerContext, P extends Path, T>(
  perms: ModelPermOption<C, T>,
  path: P
): AuthPath<C, P> => {
  if (perms.type === "authenticated") {
    return {type: "authenticated", path}
  }
  if (perms.type === "notAllowed") {
    return {type: "notAllowed", path}
  }
  if (perms.type === "publicAccess") {
    return {type: "publicAccess", path}
  }
  return {type: "authenticated", path}
}
