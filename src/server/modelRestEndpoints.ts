import {Route} from "./controller"
import {DbQueries, HasId} from "./DbClient"
import {Condition} from "../condition/condition"
import {buildQuery} from "./buildQuery"
import {
  createConditionSchema,
  partialValidator
} from "../condition/conditionSchema"
import {ZodType} from "zod"
import {ServerContext} from "./simpleServer"

export type BuilderParams<S extends ServerContext, T extends HasId> = {
  validator: ZodType<T, any, any>
  skipAuth?: Partial<SkipAuthOptions>
  endpoint: (clients: S["db"]) => DbQueries<T>
  permissions: ModelPermissions<S, T>
  actions?: ModelActions<S, T>
}

export type SkipAuthOptions = {
  get: boolean
  query: boolean
  create: boolean
  modify: boolean
  del: boolean
}

export type ModelPermissions<S, T> = {
  read: (auth: S) => Condition<T>
  delete: (auth: S) => Condition<T>
  create: (auth: S) => Condition<T>
  modify: (auth: S) => Condition<T>
}
export type ModelActions<S, T> = {
  prepareResponse?: (items: T) => T
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

export const modelRestEndpoints = <C extends ServerContext, T extends HasId>(
  builderInfo: BuilderParams<C, T>
): Route<C>[] => [
  {
    path: "/:id",
    method: "get",
    skipAuth: builderInfo.skipAuth?.get,
    endpointBuilder: getBuilder(builderInfo)
  },
  {
    path: "/query",
    method: "post",
    skipAuth: builderInfo.skipAuth?.query,
    endpointBuilder: queryBuilder(builderInfo)
  },
  {
    path: "/insert",
    method: "post",
    skipAuth: builderInfo.skipAuth?.create,
    endpointBuilder: createBuilder(builderInfo)
  },
  {
    path: "/:id",
    method: "put",
    skipAuth: builderInfo.skipAuth?.modify,
    endpointBuilder: modifyBuilder(builderInfo)
  },
  {
    path: "/:id",
    method: "delete",
    skipAuth: builderInfo.skipAuth?.del,
    endpointBuilder: deleteBuilder(builderInfo)
  }
]

const getBuilder = <T extends HasId, C extends ServerContext>(
  info: BuilderParams<C, T>
) =>
  buildQuery({
    fun: async ({req, res, ...rest}) => {
      const client = rest as C
      const {params} = req
      const {id} = params
      if (!id || typeof id !== "string") {
        return res.status(400).json("Id required")
      }

      const item = await info.endpoint(client.db).findOne({
        And: [{_id: {Equal: id}}, info.permissions.read(client)]
      })

      if (!item.success) {
        return res.status(404).json(item)
      }

      return res.json(info.actions?.prepareResponse?.(item.data) ?? item.data)
    }
  })

const queryBuilder = <T extends HasId, C extends ServerContext>(
  info: BuilderParams<C, T>
) =>
  buildQuery({
    validator: createConditionSchema(info.validator),
    fun: async ({req, res, ...rest}) => {
      const client = rest as C
      const query = info.permissions.read(client) ?? {Always: true}

      const fullQuery = {And: [req.body, query]}

      const items = await info.endpoint(client.db).findMany(fullQuery)
      return res.json(
        info.actions?.prepareResponse
          ? items.map(info.actions.prepareResponse)
          : items
      )
    }
  })

const createBuilder = <T extends HasId, C extends ServerContext>(
  info: BuilderParams<C, T>
) =>
  buildQuery({
    validator: info.validator,
    fun: async ({req, res, ...rest}) => {
      const client = rest as C
      const {body} = req

      const canCreate = info.permissions.create(client) ?? true

      if (!canCreate) {
        return res.status(401).json({error: "Cannot create"})
      }

      const processed = info.actions?.interceptCreate
        ? await info.actions.interceptCreate(body, client)
        : body

      const created = await info.endpoint(client.db).insertOne(processed)

      if (!created.success) return res.status(500).json(created)
      await info.actions?.postCreate?.(created.data, client)

      return res.json(
        info.actions?.prepareResponse?.(created.data) ?? created.data
      )
    }
  })

const modifyBuilder = <T extends HasId, C extends ServerContext>(
  info: BuilderParams<C, T>
) =>
  buildQuery({
    validator: partialValidator(info.validator),
    fun: async ({req, res, ...rest}) => {
      const client = rest as C
      const {body, params} = req
      const id = params.id

      const item = await info.endpoint(client.db).findOne({
        And: [{_id: {Equal: id}}, info.permissions.modify(client)]
      })
      if (!item.success) {
        return res.status(404).json({error: "Item not found"})
      }

      const intercepted =
        (await info.actions?.interceptModify?.(item.data, body, client)) ?? body

      const updated = await info.endpoint(client.db).updateOne(id, intercepted)
      if (!updated.success) return res.status(400).json(body)

      await info.actions?.postModify?.(updated.data, client)

      return res.json(
        info.actions?.prepareResponse?.(updated.data) ?? updated.data
      )
    }
  })

const deleteBuilder = <T extends HasId, C extends ServerContext>(
  info: BuilderParams<C, T>
) =>
  buildQuery({
    fun: async ({req, res, ...rest}) => {
      const client = rest as C

      if (!req.params.id) {
        return res.status(400).json({error: "Provide a valid id"})
      }
      const item = await info.endpoint(client.db).findOne({
        And: [{_id: {Equal: req.params.id}}, info.permissions.delete(client)]
      })
      if (!item.success) {
        return res.status(404).json({error: "Not found"})
      }
      await info.actions?.interceptDelete?.(item.data, client)

      const deleted = await info.endpoint(client.db).deleteOne(req.params.id)

      await info.actions?.postDelete?.(deleted, client)
      return res.json(deleted._id)
    }
  })
