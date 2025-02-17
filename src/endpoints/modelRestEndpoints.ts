import {Route} from "../server/controller"
import {DbMethods, HasId} from "../server/DbMethods"
import {Condition} from "../condition/condition"
import {AuthOptions, buildQuery} from "./buildQuery"
import {createQuerySchema, Query} from "../condition/conditionSchema"
import {ZodType} from "zod"
import {ServerContext} from "../server/simpleServer"
import {Parsable, partialValidator} from "../server"
import {evalCondition} from "../condition"

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
 * 'publicAccess' - No authentication is required
 * 'notAllowed' - This is not allowed for any user with any level of authentication
 * 'modelAuth' - Condition determining whether a user can perform an action for T
 *
 * If multiple keys of 'ModelPermOption' are provided they are calculated as "Ors"
 * WARNING: If 'skipAuth' is provided, 'userAuth' and 'modelAuth' will be ignored
 */
export type ModelPermOption<C extends ServerContext, T> =
  | {type: "publicAccess"}
  | {type: "notAllowed"}
  | {type: "authenticated"}
  | {type: "modelAuth"; check: (auth: C["auth"]) => Condition<T>}

// No Auth Required: () => ({Always: true})
// Never: () => ({Never: true})

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
 * https://github.com/WesleyEdwards/simply-served/blob/main/docs/ModelRestEndpoints.md
 *
 * @param builderInfo Information for building rest endpoints, including:
 * Schema Validation
 * Getter for Db collection
 * Permissions
 * Server actions
 * @returns auto-generated endpoints
 */
export function modelRestEndpoints<C extends ServerContext, T extends HasId>(
  builderInfo: BuilderParams<C, T>
): Route<C, any, boolean>[] {
  return [
    {
      path: "/:id",
      method: "get",
      endpointBuilder: getBuilder(builderInfo),
    },
    {
      path: "/query",
      method: "post",
      endpointBuilder: queryBuilder(builderInfo),
    },
    {
      path: "/insert",
      method: "post",
      endpointBuilder: createBuilder(builderInfo),
    },
    {
      path: "/:id",
      method: "put",
      endpointBuilder: modifyBuilder(builderInfo),
    },
    {
      path: "/:id",
      method: "delete",
      endpointBuilder: deleteBuilder(builderInfo),
    },
  ]
}

const getBuilder = <C extends ServerContext, T extends HasId>(
  info: BuilderParams<C, T>
) =>
  buildQuery<C, T>({
    authOptions: getAuthOptions(info.permissions, "read"),
    fun: async ({req, res, ...rest}) => {
      const client = rest as unknown as C
      const {params} = req
      const {id} = params
      if (!id || typeof id !== "string") {
        return res.status(400).json("Id required")
      }

      try {
        const item = await info.collection(client.db).findOne({
          And: [
            {_id: {Equal: id}},
            getItemCondition(info.permissions, client, "read"),
          ],
        })
        return res.json(info.actions?.prepareResponse?.(item, client) ?? item)
      } catch {
        return res.status(404).json({message: "Not Found"})
      }
    },
  })

const queryBuilder = <C extends ServerContext, T extends HasId>(
  info: BuilderParams<C, T>
) =>
  buildQuery<C, Query<T>>({
    authOptions: getAuthOptions(info.permissions, "read"),
    validator: createQuerySchema(info.validator),
    fun: async ({req, res, ...rest}) => {
      const client = rest as unknown as C

      const items = await info.collection(client.db).findMany({
        condition: {
          And: [
            req.body.condition ?? {Always: true},
            getItemCondition(info.permissions, client, "read"),
          ],
        },
        limit: req.body.limit,
      })

      if (info.actions?.prepareResponse) {
        return res.json(
          items.map((item) => info.actions!.prepareResponse!(item, client))
        )
      }
      return res.json(items)
    },
  })

const createBuilder = <C extends ServerContext, T extends HasId>(
  info: BuilderParams<C, T>
) =>
  buildQuery<C, T>({
    authOptions: getAuthOptions(info.permissions, "create"),
    validator: info.validator as unknown as Parsable<T>,
    fun: async ({req, res, ...rest}) => {
      const client = rest as unknown as C
      const {body} = req

      const canCreate = evalCondition(
        body,
        getItemCondition(info.permissions, client, "create")
      )

      if (!canCreate) {
        return res.status(401).json({error: "Cannot create"})
      }

      const processed = info.actions?.interceptCreate
        ? await info.actions.interceptCreate(body, client)
        : body

      try {
        const created = await info.collection(client.db).insertOne(processed)
        await info.actions?.postCreate?.(created, client)
        return res.json(
          info.actions?.prepareResponse?.(created, client) ?? created
        )
      } catch {
        return res.status(500).json({error: "Unable to create item"})
      }
    },
  })

const modifyBuilder = <C extends ServerContext, T extends HasId>(
  info: BuilderParams<C, T>
) =>
  buildQuery<C, T>({
    authOptions: getAuthOptions(info.permissions, "modify"),
    validator: partialValidator(info.validator) as unknown as Parsable<T>,
    fun: async ({req, res, ...rest}) => {
      const client = rest as unknown as C
      const {body, params} = req
      const id = params.id

      const item = await info.collection(client.db).findOne({
        And: [
          {_id: {Equal: id}},
          getItemCondition(info.permissions, client, "modify"),
        ],
      })
      const intercepted =
        (await info.actions?.interceptModify?.(item, body, client)) ?? body

      const updated = await info
        .collection(client.db)
        .updateOne(id, intercepted)

      await info.actions?.postModify?.(updated, client)

      return res.json(
        info.actions?.prepareResponse?.(updated, client) ?? updated
      )
    },
  })

const deleteBuilder = <C extends ServerContext, T extends HasId>(
  info: BuilderParams<C, T>
) =>
  buildQuery<C, T>({
    authOptions: getAuthOptions(info.permissions, "delete"),
    fun: async ({req, res, ...rest}) => {
      const client = rest as unknown as C

      if (!req.params.id) {
        return res.status(400).json({error: "Provide a valid id"})
      }
      const item = await info.collection(client.db).findOne({
        And: [
          {_id: {Equal: req.params.id}},
          getItemCondition(info.permissions, client, "delete"),
        ],
      })
      await info.actions?.interceptDelete?.(item, client)

      const deleted = await info.collection(client.db).deleteOne(req.params.id)

      await info.actions?.postDelete?.(deleted, client)
      return res.json(deleted._id)
    },
  })

// Can perform action on item
const getItemCondition = <C extends ServerContext, T extends HasId>(
  perms: BuilderParams<C, T>["permissions"],
  clients: C,
  type: "read" | "create" | "modify" | "delete"
): Condition<T> => {
  const value = perms[type]
  if (value.type === "notAllowed") {
    return {Never: true}
  }
  if (value.type === "publicAccess") {
    return {Always: true}
  }
  if (value.type === "authenticated") {
    return {Always: true}
  }
  return value.check(clients.auth)
}

/**
 * Determines whether the buildQuery.fun is authorized and accessible.
 * If modelAuth is provided, that'll be checked in 'getItemCondition'
 */
const getAuthOptions = <C extends ServerContext, T extends HasId>(
  perms: BuilderParams<C, T>["permissions"],
  type: "read" | "create" | "modify" | "delete"
): AuthOptions<C> => {
  const value = perms[type]
  if (value.type === "notAllowed" || value.type === "publicAccess") {
    return value
  }
  return {
    type: "customAuth",
    check: () => true,
  }
}
