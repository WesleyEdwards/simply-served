import {Route} from "../server/controller"
import {DbMethods, HasId} from "../server/DbMethods"
import {Condition} from "../condition/condition"
import {AuthOptions, buildQuery} from "./buildQuery"
import {createQuerySchema} from "../condition/conditionSchema"
import {ZodType} from "zod"
import {ServerContext} from "../server/simpleServer"
import {partialValidator} from "../server"
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
 * Permissions
 * 'publicAccess' - No authentication is required
 * 'authenticated' - Permission granted to any authenticated user
 * 'notAllowed' - Permission is Not granted to anyone
 * 'modelAuth' - Permission granted based on the Condition provided through 'check'
 */
export type ModelPermOption<C extends ServerContext, T> =
  | {type: "publicAccess"}
  | {type: "notAllowed"}
  | {type: "authenticated"}
  | {type: "modelAuth"; check: (auth: C["auth"]) => Condition<T>}

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
    buildQuery<C>({path: "/:id", method: "get"})
      .withAuth(getAuthOptions(builderInfo.permissions, "read"))
      .build(async ({req, res, ...rest}) => {
        const client = rest as unknown as C
        const {params} = req
        const {id} = params
        if (!id || typeof id !== "string") {
          return res.status(400).json("Id required")
        }

        try {
          const item = await builderInfo.collection(client.db).findOne({
            And: [
              {_id: {Equal: id}},
              getItemCondition(builderInfo.permissions, client, "read"),
            ],
          })
          return res.json(
            builderInfo.actions?.prepareResponse?.(item, client) ?? item
          )
        } catch {
          return res.status(404).json({message: "Not Found"})
        }
      }),
    buildQuery<C>({path: "/query", method: "post"})
      .withAuth(getAuthOptions(builderInfo.permissions, "read"))
      .withBody({validator: createQuerySchema(builderInfo.validator)})
      .build(async ({req, res, ...rest}) => {
        const client = rest as unknown as C

        const items = await builderInfo.collection(client.db).findMany({
          condition: {
            And: [
              req.body.condition ?? {Always: true},
              getItemCondition(builderInfo.permissions, client, "read"),
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
      }),
    buildQuery<C>({path: "/insert", method: "post"})
      .withAuth(getAuthOptions(builderInfo.permissions, "create"))
      .withBody({validator: builderInfo.validator})
      .build(async ({req, res, ...rest}) => {
        const client = rest as unknown as C
        const {body} = req

        const canCreate = evalCondition(
          body,
          getItemCondition(builderInfo.permissions, client, "create")
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
      }),
    buildQuery<C>({path: "/:id", method: "put"})
      .withAuth(getAuthOptions(builderInfo.permissions, "modify"))
      .withBody({validator: partialValidator(builderInfo.validator)})
      .build(async ({req, res, ...rest}) => {
        const client = rest as unknown as C
        const {body, params} = req
        const id = params.id

        const item = await builderInfo.collection(client.db).findOne({
          And: [
            {_id: {Equal: id}},
            getItemCondition(builderInfo.permissions, client, "modify"),
          ],
        })
        const intercepted =
          (await builderInfo.actions?.interceptModify?.(item, body, client)) ??
          body

        const updated = await builderInfo
          .collection(client.db)
          .updateOne(id, intercepted)

        await builderInfo.actions?.postModify?.(updated, client)

        return res.json(
          builderInfo.actions?.prepareResponse?.(updated, client) ?? updated
        )
      }),
    buildQuery<C>({path: "/:id", method: "delete"})
      .withAuth(getAuthOptions(builderInfo.permissions, "delete"))
      .build(async ({req, res, ...rest}) => {
        const client = rest as unknown as C

        if (!req.params.id) {
          return res.status(400).json({error: "Provide a valid id"})
        }
        const item = await builderInfo.collection(client.db).findOne({
          And: [
            {_id: {Equal: req.params.id}},
            getItemCondition(builderInfo.permissions, client, "delete"),
          ],
        })
        await builderInfo.actions?.interceptDelete?.(item, client)

        const deleted = await builderInfo
          .collection(client.db)
          .deleteOne(req.params.id)

        await builderInfo.actions?.postDelete?.(deleted, client)
        return res.json(deleted._id)
      }),
  ]
}

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
