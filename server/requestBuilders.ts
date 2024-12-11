import {Route, SClient} from "./controller"
import {DbQueries, HasId} from "../DbClient"
import {Condition} from "../condition/condition"
import {buildQuery} from "./buildQuery"
import {
  createConditionSchema,
  partialValidator
} from "../condition/conditionSchema"
import {isValid} from "../validation"
import {ZodType} from "zod"

export type BuilderParams<T extends HasId, C extends SClient, Auth> = {
  validator: ZodType<T, any, any>
  skipAuth?: {
    get?: boolean
    query?: boolean
    create?: boolean
    modify?: boolean
    del?: boolean
  }
  endpoint: (clients: C["db"]) => DbQueries<T>
  permissions: {
    read: (auth: Auth) => Condition<T>
    delete: (auth: Auth) => Condition<T>
    create: (auth: Auth) => Condition<T>
    modify: (auth: Auth) => Condition<T>
  }
  actions?: {
    // Get
    prepareResponse?: (items: T) => T
    // Create
    interceptCreate?: (item: T, clients: C) => Promise<T>
    postCreate?: (item: T, clients: C) => Promise<unknown>
    // Modify
    interceptModify?: (
      item: T,
      mod: Partial<T>,
      clients: C
    ) => Promise<Partial<T>>
    postModify?: (item: T, clients: C) => Promise<unknown>
    // Delete
    interceptDelete?: (item: T, clients: C) => Promise<T>
    postDelete?: (item: T, clients: C) => Promise<unknown>
  }
}

export const createBasicEndpoints = <T extends HasId, C extends SClient, Auth>(
  builderInfo: BuilderParams<T, C, Auth>
): Route<any, C, any>[] => [
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

const getBuilder = <T extends HasId, C extends SClient>(
  info: BuilderParams<T, C, any>
) =>
  buildQuery({
    fun: async ({req, res, db}) => {
      const {params, jwtBody} = req
      const {id} = params
      if (!id || typeof id !== "string") {
        return res.status(400).json("Id required")
      }

      const item = await info.endpoint(db).findOne({
        And: [{_id: {Equal: id}}, info.permissions.read(jwtBody)]
      })

      if ("error" in item) {
        return res.status(404).json(item)
      }

      return res.json(info.actions?.prepareResponse?.(item) ?? item)
    }
  })

const queryBuilder = <T extends HasId, C extends SClient>(
  info: BuilderParams<T, C, any>
) =>
  buildQuery({
    validator: createConditionSchema(info.validator),
    fun: async ({req, res, db}) => {
      const query = info.permissions.read(req.jwtBody) ?? {Always: true}

      const fullQuery = {And: [req.body, query]}

      const items = await info.endpoint(db).findMany(fullQuery)
      return res.json(
        info.actions?.prepareResponse
          ? items.map(info.actions.prepareResponse)
          : items
      )
    }
  })

const createBuilder = <T extends HasId, C extends SClient>(
  info: BuilderParams<T, C, any>
) =>
  buildQuery({
    validator: info.validator,
    fun: async ({req, res, ...rest}) => {
      const client = rest as C
      const {jwtBody, body} = req

      const canCreate = info.permissions.create(jwtBody) ?? true

      if (!canCreate) {
        return res.status(401).json({error: "Cannot create"})
      }

      const processed = info.actions?.interceptCreate
        ? await info.actions.interceptCreate(body, client)
        : body

      const created = await info.endpoint(client.db).insertOne(processed)

      if (!isValid<T>(created)) return res.status(500).json(created)
      await info.actions?.postCreate?.(created, client)

      return res.json(info.actions?.prepareResponse?.(created) ?? created)
    }
  })

const modifyBuilder = <T extends HasId, C extends SClient>(
  info: BuilderParams<T, C, any>
) =>
  buildQuery({
    validator: partialValidator(info.validator),
    fun: async ({req, res, ...rest}) => {
      const client = rest as C
      const {body, params, jwtBody} = req
      const id = params.id

      const item = await info.endpoint(client.db).findOne({
        And: [{_id: {Equal: id}}, info.permissions.modify(jwtBody)]
      })
      if (!isValid<T>(item)) {
        return res.status(404).json({error: "Item not found"})
      }

      const intercepted =
        (await info.actions?.interceptModify?.(item, body, client)) ?? body

      const updated = await info.endpoint(client.db).updateOne(id, intercepted)
      if (!isValid<T>(updated)) return res.status(400).json(body)

      await info.actions?.postModify?.(updated, client)

      return res.json(info.actions?.prepareResponse?.(updated) ?? updated)
    }
  })

const deleteBuilder = <T extends HasId, C extends SClient>(
  info: BuilderParams<T, C, any>
) =>
  buildQuery({
    fun: async ({req, res, ...rest}) => {
      const client = rest as C

      const item = await info.endpoint(client.db).findOne({
        And: [{_id: {Equal: client.db}}, info.permissions.delete(req.jwtBody)]
      })
      if (!isValid<T>(item)) {
        return res.status(404).json({error: "Not found"})
      }
      await info.actions?.interceptDelete?.(item, client)

      const deleted = await info.endpoint(client.db).deleteOne(req.params.id)

      await info.actions?.postDelete?.(deleted, client)
      return res.json(deleted._id)
    }
  })
