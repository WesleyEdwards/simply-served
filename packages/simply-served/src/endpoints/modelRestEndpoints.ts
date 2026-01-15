import {Route} from "../server/controller"
import {DbMethods, HasId} from "../server/DbMethods"
import {Condition} from "../condition/condition"
import {AuthPath, buildRouteRaw, Path} from "./buildRoute"
import {createCountSchema, createQuerySchema} from "../condition/conditionSchema"
import {ZodObject} from "zod"
import {partialValidator} from "../server"
import {evalCondition} from "../condition"
import {RequestWithAuth, ServerContext} from "../types"

export type BuilderParams<C extends ServerContext, T extends HasId> = {
  validator: ZodObject<any, any>
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
  | {type: "modelAuth"; check: (ctx: C) => Promise<Condition<T>>}
  | {type: "notAllowed"}

export type ModelActions<S extends ServerContext, T> = {
  prepareResponse?: (items: T, req: RequestWithAuth<S>) => T
  interceptCreate?: (item: T, req: RequestWithAuth<S>) => Promise<T>
  postCreate?: (item: T, req: RequestWithAuth<S>) => Promise<unknown>
  interceptModify?: (
    item: T,
    mod: Partial<T>,
    req: RequestWithAuth<S>
  ) => Promise<Partial<T>>
  postModify?: (item: T, req: RequestWithAuth<S>) => Promise<unknown>
  interceptDelete?: (item: T, req: RequestWithAuth<S>) => Promise<T>
  postDelete?: (item: T, req: RequestWithAuth<S>) => Promise<unknown>
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
): Record<"detail" | "query" | "count" | "insert" | "modify" | "delete", Route<C>> {
  return {
    detail: buildRouteRaw({
      route: {
        authPath: getAuthOptions(builderInfo.permissions.read, {
          type: "id",
          route: `/detail/:id`,
        }),
        method: "get",
        fun: async (r, res, auth, {id}) => {
          const req = r as RequestWithAuth<C>

          try {
            const item = await builderInfo.collection(req.db).findOne({
              And: [
                {_id: {Equal: id}},
                await getItemCondition(builderInfo.permissions.read, req),
              ],
            })
            return res.json(
              builderInfo.actions?.prepareResponse?.(item, req) ?? item
            )
          } catch {
            return res.status(404).json({error: `Item with id '${id}' not found`})
          }
        },
      },
    }),
    query: buildRouteRaw({
      route: {
        authPath: getAuthOptions(builderInfo.permissions.read, {
          type: "route",
          route: `/query`,
        }),
        method: "post",
        fun: async (r, res, auth) => {
          const req = r as RequestWithAuth<C>
          const items = await builderInfo.collection(req.db).findMany({
            condition: {
              And: [
                req.body.condition ?? {Always: true},
                await getItemCondition(builderInfo.permissions.read, req),
              ],
            },
            limit: req.body.limit,
            skip: req.body.skip,
          })

          if (builderInfo.actions?.prepareResponse) {
            return res.json(
              items.map((item) =>
                builderInfo.actions!.prepareResponse!(item, req)
              )
            )
          }
          return res.json(items)
        },
      },
      validator: createQuerySchema(builderInfo.validator),
    }),

    count: buildRouteRaw({
      route: {
        authPath: getAuthOptions(builderInfo.permissions.read, {
          type: "route",
          route: `/count`,
        }),
        method: "post",
        fun: async (r, res) => {
          const req = r as RequestWithAuth<C>
          const count = await builderInfo.collection(req.db).count({
            And: [
              req.body.condition ?? {Always: true},
              await getItemCondition(builderInfo.permissions.read, req),
            ],
          })
          return res.json({count})
        },
      },
      validator: createCountSchema(builderInfo.validator),
    }),

    insert: buildRouteRaw({
      validator: builderInfo.validator,
      route: {
        authPath: getAuthOptions(builderInfo.permissions.create, {
          type: "route",
          route: "/insert",
        }),
        method: "post",
        fun: async (r, res, auth) => {
          const req = r as unknown as RequestWithAuth<C>
          const {body} = req

          const canCreate = evalCondition(
            body,
            await getItemCondition(builderInfo.permissions.create, req)
          )

          if (!canCreate) {
            return res
              .status(403)
              .json({error: "Permission denied: cannot create this item"})
          }

          const processed = builderInfo.actions?.interceptCreate
            ? await builderInfo.actions.interceptCreate(body, req)
            : body

          try {
            const created = await builderInfo
              .collection(req.db)
              .insertOne(processed)
            await builderInfo.actions?.postCreate?.(created, req)
            return res.json(
              builderInfo.actions?.prepareResponse?.(created, req) ?? created
            )
          } catch (e) {
            const message = e instanceof Error ? e.message : "Unknown error"
            return res
              .status(500)
              .json({error: `Failed to create item: ${message}`})
          }
        },
      },
    }),

    modify: buildRouteRaw({
      route: {
        method: "put",
        authPath: getAuthOptions(builderInfo.permissions.modify, {
          type: "id",
          route: "/modify/:id",
        }),
        fun: async (r, res, auth, {id}) => {
          const req = r as unknown as RequestWithAuth<C>
          const {body} = req

          if (!req.params.id) {
            return res.status(400).json({error: "Missing required path parameter: id"})
          }

          try {
            const item = await builderInfo.collection(req.db).findOne({
              And: [
                {_id: {Equal: id}},
                await getItemCondition(builderInfo.permissions.modify, req),
              ],
            })
            const intercepted =
              (await builderInfo.actions?.interceptModify?.(item, body, req)) ??
              body

            const updated = await builderInfo
              .collection(req.db)
              .updateOne(id, intercepted)

            await builderInfo.actions?.postModify?.(updated, req)

            return res.json(
              builderInfo.actions?.prepareResponse?.(updated, req) ?? updated
            )
          } catch (e) {
            if (e instanceof Error && e.message.includes("not found")) {
              return res
                .status(404)
                .json({error: `Item with id '${id}' not found or access denied`})
            }
            const message = e instanceof Error ? e.message : "Unknown error"
            return res
              .status(500)
              .json({error: `Failed to modify item: ${message}`})
          }
        },
      },
      validator: partialValidator(builderInfo.validator),
    }),

    delete: buildRouteRaw({
      route: {
        method: "delete",
        authPath: getAuthOptions(builderInfo.permissions.delete, {
          type: "id",
          route: "/:id",
        }),
        fun: async (r, res) => {
          const req = r as RequestWithAuth<C>
          const id = req.params.id

          if (!id) {
            return res.status(400).json({error: "Missing required path parameter: id"})
          }

          try {
            const item = await builderInfo.collection(req.db).findOne({
              And: [
                {_id: {Equal: id}},
                await getItemCondition(builderInfo.permissions.delete, req),
              ],
            })
            await builderInfo.actions?.interceptDelete?.(item, req)

            const deleted = await builderInfo.collection(req.db).deleteOne(id)

            await builderInfo.actions?.postDelete?.(deleted, req)
            return res.json(deleted._id)
          } catch (e) {
            if (e instanceof Error && e.message.includes("not found")) {
              return res
                .status(404)
                .json({error: `Item with id '${id}' not found or access denied`})
            }
            const message = e instanceof Error ? e.message : "Unknown error"
            return res
              .status(500)
              .json({error: `Failed to delete item: ${message}`})
          }
        },
      },
    }),
  }
}

// Can perform action on item
const getItemCondition = async <C extends ServerContext, T extends HasId>(
  perms: ModelPermOption<C, T>,
  ctx: C
): Promise<Condition<T>> => {
  if (perms.type === "notAllowed") {
    return {Never: true}
  }
  if (perms.type === "publicAccess") {
    return {Always: true}
  }
  if (perms.type === "authenticated") {
    return {Always: true}
  }
  if (perms.type === "modelAuth") {
    return perms.check(ctx)
  }
  throw Error("Invalid perms")
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
