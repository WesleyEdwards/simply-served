import {Route} from "../server/controller"
import {DbMethods, HasId} from "../server/DbClient"
import {Condition} from "../condition/condition"
import {buildQuery} from "./buildQuery"
import {createConditionSchema} from "../condition/conditionSchema"
import {ZodType} from "zod"
import {ServerContext} from "../server/simpleServer"
import {Parsable, partialValidator} from "../server"
import {evalCondition} from "../condition"

export type BuilderParams<S extends ServerContext, T extends HasId> = {
  validator: ZodType<T, any, any>
  collection: (clients: S["db"]) => DbMethods<T>
  permissions: ModelPermissions<S, T>
  actions?: ModelActions<S, T>
}

/**
 * 'skipAuth' - Condition that determines if any auth is checked
 * 'userAuth' - Condition based on a users permission to determine if they can perform an action
 * 'modelAuth' - Condition determining whether a user can perform an action for T
 *
 * If multiple keys of 'ModelPermOption' are provided they are calculated as "Ors"
 */
export type ModelPermOption<S extends ServerContext, T> = {
  skipAuth?: Condition<T>
  userAuth?: Condition<S["auth"]>
  modelAuth?: (auth: S["auth"]) => Condition<T>
}

export type ModelPermissions<S extends ServerContext, T> = {
  read: ModelPermOption<S, T>
  delete: ModelPermOption<S, T>
  create: ModelPermOption<S, T>
  modify: ModelPermOption<S, T>
}

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

const getBuilder = <T extends HasId, C extends ServerContext>(
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

const queryBuilder = <T extends HasId, C extends ServerContext>(
  info: BuilderParams<C, T>
) =>
  buildQuery<C, T>({
    authOptions: getAuthOptions(info.permissions, "read"),
    validator: createConditionSchema(info.validator),
    fun: async ({req, res, ...rest}) => {
      const client = rest as unknown as C

      const fullQuery = {
        And: [req.body, getItemCondition(info.permissions, client, "read")],
      }

      const items = await info.collection(client.db).findMany(fullQuery)
      if (info.actions?.prepareResponse) {
        return res.json(
          items.map((item) => info.actions!.prepareResponse!(item, client))
        )
      }
      return res.json(items)
    },
  })

const createBuilder = <T extends HasId, C extends ServerContext>(
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

const modifyBuilder = <T extends HasId, C extends ServerContext>(
  info: BuilderParams<C, T>
) =>
  buildQuery<C, T>({
    authOptions: getAuthOptions(info.permissions, "modify"),
    validator: partialValidator(info.validator) as unknown as Parsable<T>,
    fun: async ({req, res, ...rest}) => {
      const client = rest as unknown as C
      const {body, params} = req
      const id = params.id

      try {
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
        // if (!updated) return res.status(400).json(body)

        await info.actions?.postModify?.(updated, client)

        return res.json(
          info.actions?.prepareResponse?.(updated, client) ?? updated
        )
      } catch {
        return res.status(404).json({error: "Item not found"})
      }
    },
  })

const deleteBuilder = <T extends HasId, C extends ServerContext>(
  info: BuilderParams<C, T>
) =>
  buildQuery<C, T>({
    authOptions: getAuthOptions(info.permissions, "delete"),
    fun: async ({req, res, ...rest}) => {
      const client = rest as unknown as C

      if (!req.params.id) {
        return res.status(400).json({error: "Provide a valid id"})
      }
      try {
        const item = await info.collection(client.db).findOne({
          And: [
            {_id: {Equal: req.params.id}},
            getItemCondition(info.permissions, client, "delete"),
          ],
        })
        await info.actions?.interceptDelete?.(item, client)

        const deleted = await info
          .collection(client.db)
          .deleteOne(req.params.id)

        await info.actions?.postDelete?.(deleted, client)
        return res.json(deleted._id)
      } catch {
        return res.status(404).json({error: "Error deleting item"})
      }
    },
  })

const extractItemCondition = <C extends ServerContext, T extends HasId>(
  value: ModelPermOption<C, T>,
  clients: C
): Condition<T> => {
  if (value.skipAuth) {
    return {Always: true}
  }
  if (value.modelAuth) {
    return value.modelAuth(clients.auth)
  }
  return {Always: true}
}
const extractAuthCondition = <C extends ServerContext, T extends HasId>(
  value: ModelPermOption<C, T>
): Condition<C["auth"]> => {
  if (value.skipAuth) {
    return {Always: true}
  }
  if (value.modelAuth) {
    return {Always: true}
  }
  if (value.userAuth) {
    return value.userAuth
  }
  return {Always: true}
}

// Can perform action on item
const getItemCondition = <C extends ServerContext, T extends HasId>(
  perms: BuilderParams<C, T>["permissions"],
  clients: C,
  type: "read" | "create" | "modify" | "delete"
): Condition<T> => {
  const val = perms[type]
  return extractItemCondition(val, clients)
}

// User can perform action
const getAuthOptions = <C extends ServerContext, T extends HasId>(
  perms: BuilderParams<C, T>["permissions"],
  type: "read" | "create" | "modify" | "delete"
): {auth: (auth: C["auth"]) => Condition<C["auth"]>} | {skipAuth: true} => {
  const val = perms[type]

  if (val.skipAuth) {
    return {skipAuth: true}
  }

  return {
    auth: (auth: C["auth"]) => {
      return extractAuthCondition(val)
    },
  }
}
