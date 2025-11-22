import {Route} from "../server/controller"
import {DbMethods, HasId} from "../server/DbMethods"
import {Condition} from "../condition/condition"
import {AuthPath, buildRouteRaw, Path} from "./buildRoute"
import {createQuerySchema} from "../condition/conditionSchema"
import {ZodObject} from "zod"
import {InvalidRequestError, partialValidator} from "../server"
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
): Record<"detail" | "query" | "insert" | "modify" | "delete", Route<C>> {
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
            return res.status(404).json({message: "Not Found"})
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

    insert: buildRouteRaw({
      route: {
        authPath: getAuthOptions(builderInfo.permissions.create, {
          type: "route",
          route: "/insert",
        }),
        method: "post",
        fun: async (r, res, auth) => {
          const req = r as unknown as RequestWithAuth<C>
          const {body} = req

          const validBody = builderInfo.validator.safeParse(body)

          if (validBody.error) {
            throw new InvalidRequestError(JSON.stringify(validBody.error))
          }
          const parsed = validBody.data as T

          const canCreate = evalCondition(
            parsed,
            await getItemCondition(builderInfo.permissions.create, req)
          )

          if (!canCreate) {
            return res.status(401).json({error: "Cannot create"})
          }

          const processed = builderInfo.actions?.interceptCreate
            ? await builderInfo.actions.interceptCreate(parsed, req)
            : parsed

          try {
            const created = await builderInfo
              .collection(req.db)
              .insertOne(processed)
            await builderInfo.actions?.postCreate?.(created, req)
            return res.json(
              builderInfo.actions?.prepareResponse?.(created, req) ?? created
            )
          } catch {
            return res.status(500).json({error: "Unable to create item"})
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
            return res.status(400).json({error: "Provide a valid id"})
          }

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
        fun: async (r, res, auth) => {
          const req = r as RequestWithAuth<C>

          if (!req.params.id) {
            return res.status(400).json({error: "Provide a valid id"})
          }
          const item = await builderInfo.collection(req.db).findOne({
            And: [
              {_id: {Equal: req.params.id}},
              await getItemCondition(builderInfo.permissions.delete, req),
            ],
          })
          await builderInfo.actions?.interceptDelete?.(item, req)

          const deleted = await builderInfo
            .collection(req.db)
            .deleteOne(req.params.id)

          await builderInfo.actions?.postDelete?.(deleted, req)
          return res.json(deleted._id)
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
