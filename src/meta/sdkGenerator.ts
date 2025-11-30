// import {Condition} from "condition"
import {MetaInfo} from "../meta"
import {ZodType} from "zod"
import {Query} from "server/query"

export function generateSdk(meta: MetaInfo[]): string {
  const endpoints = meta.filter((m) => m.type === "endpoint")

  const interfaces: string[] = []
  const groups: Record<string, string[]> = {}
  const liveApiGroups: Record<string, string[]> = {}

  // Helper to ensure unique type names
  const typeNames = new Set<string>()
  const getUniqueTypeName = (base: string) => {
    let name = base
    let i = 1
    while (typeNames.has(name)) {
      name = `${base}${i++}`
    }
    typeNames.add(name)
    return name
  }

  // 1. Identify Models per Group
  const groupModels: Record<string, string> = {} // group -> ModelName

  // Group endpoints by group
  const endpointsByGroup: Record<string, typeof endpoints> = {}
  endpoints.forEach((e) => {
    if (!endpointsByGroup[e.group]) endpointsByGroup[e.group] = []
    endpointsByGroup[e.group].push(e)
  })

  // Process each group to find the model
  Object.keys(endpointsByGroup).forEach((group) => {
    const groupEndpoints = endpointsByGroup[group]
    // Heuristic: The 'create' endpoint (POST /group) usually takes the full model
    const createEndpoint = groupEndpoints.find((e) => {
      const relativePath = e.name.replace(new RegExp(`^/${group}`), "") || "/"
      return e.method === "post" && relativePath === "/insert"
    })

    if (createEndpoint?.body) {
      const modelName = capitalize(group) // e.g. User
      const uniqueModelName = getUniqueTypeName(modelName)
      const tsType = zodToTs(createEndpoint.body, uniqueModelName)
      // interfaces_1[uniqueModelName] = tsType
      interfaces.push(`export type ${uniqueModelName} = ${tsType}`)
      groupModels[group] = uniqueModelName
    }
  })

  // 2. Generate Endpoints
  endpoints.forEach((endpoint) => {
    const {name, method, body, args, group} = endpoint

    // Determine function name
    const relativePath = name.replace(new RegExp(`^/${group}`), "") || "/"
    let funcName = ""
    if (method === "get") {
      if (relativePath === "/" || relativePath === "") funcName = "query"
      else if (relativePath.includes(":")) funcName = "detail"
      else funcName = camelCase(relativePath)
    } else if (method === "post") {
      if (relativePath === "/" || relativePath === "") funcName = "create"
      else funcName = camelCase(relativePath)
    } else if (method === "put") {
      funcName = "modify"
    } else if (method === "delete") {
      funcName = "delete"
    }
    if (!funcName) funcName = method + relativePath.replace(/\W/g, "_")
    funcName = funcName.replace(/^_+|_+$/g, "")
    if (!funcName) funcName = method

    let bodyType = "any"
    const modelName = groupModels[group]

    if (body) {
      if (funcName === "query" && modelName) {
        bodyType = `Query<${modelName}>`
      } else if (funcName === "modify" && modelName) {
        bodyType = `Modification<${modelName}>`
      } else if (funcName === "insert" && modelName) {
        bodyType = modelName
      } else {
        // Fallback to generated type
        const baseTypeName = capitalize(funcName) + capitalize(group) + "Body"
        const typeName = getUniqueTypeName(baseTypeName)
        const tsType = zodToTs(body, typeName)
        interfaces.push(`export type ${typeName} = ${tsType}`)
        bodyType = typeName
      }
    }

    const argsList = Object.keys(args)
      .map((arg) => `${arg}: ${args[arg]}`)
      .join(", ")
    const argsParam = argsList ? `${argsList}` : ""
    const fullArgs = [argsParam, body ? `body: ${bodyType}` : ""]
      .filter(Boolean)
      .join(", ")

    // Return type - try to use ModelName if applicable
    let returnType = "Promise<any>"
    if (modelName) {
      if (
        funcName === "detail" ||
        funcName === "create" ||
        funcName === "modify" ||
        funcName === "delete"
      ) {
        returnType = `Promise<${modelName}>`
      } else if (funcName === "query") {
        returnType = `Promise<${modelName}[]>`
      }
    }

    // Add to Interface
    if (!groups[group]) groups[group] = []
    groups[group].push(`${funcName}: (${fullArgs}) => ${returnType}`)

    // Add to LiveApi
    if (!liveApiGroups[group]) liveApiGroups[group] = []

    const pathTemplate = `/${group}${name.replace(/:(\w+)/g, "${$1}")}`
    const fetcherArgs = [`\`${pathTemplate}\``, `"${method.toUpperCase()}"`]
    if (body) fetcherArgs.push("body")

    liveApiGroups[group].push(
      `${funcName}: (${fullArgs}) => this.fetcher(${fetcherArgs.join(", ")})`
    )
  })

  const apiInterface = `
export interface Api {
${Object.keys(groups)
  .map(
    (g) => `  readonly ${g}: {
${groups[g].map((f) => `    ${f}`).join("\n")}
  }`
  )
  .join("\n")}
}
`

  const liveApiClass = `
export class LiveApi implements Api {
  constructor(private fetcher: Fetcher) {}
${Object.keys(liveApiGroups)
  .map(
    (g) => `  ${g}: Api["${g}"] = {
${liveApiGroups[g].map((f) => `    ${f}`).join(",\n")}
  }`
  )
  .join("\n")}
}
`

  return `
// Auto-generated SDK
import {Query, Fetcher, Method, Modification} from "simply-served-client";

${interfaces.join("\n")}


${apiInterface}

${liveApiClass}
`
}

export function zodToTs(schema: ZodType<any, any, any>, name?: string): string {
  const def = schema.def
  const typeName =
    def?.typeName || (def?.type ? `Zod${capitalize(def.type)}` : "ZodAny")

  if (typeName === "ZodString") return "string"
  if (typeName === "ZodNumber") return "number"
  if (typeName === "ZodBoolean") return "boolean"
  if (typeName === "ZodDate") return "Date"
  if (typeName === "ZodNull") return "null"
  if (typeName === "ZodUndefined") return "undefined"
  if (typeName === "ZodAny") return "any"
  if (typeName === "ZodUnknown") return "unknown"
  if (typeName === "ZodVoid") return "void"
  if (typeName === "ZodArray") {
    return `${zodToTs(def.type?._def ? def.type : def.element)}[]`
  }
  if (typeName === "ZodObject") {
    const shape = def.shape
      ? typeof def.shape === "function"
        ? def.shape()
        : def.shape
      : {}

    const keys = Object.keys(shape)
    if (isQuery(shape)) {
      return `Query<${name}>`
    }

    const props = keys
      .map((key) => {
        const isOptional = isSdkOptional(shape[key])
        return `${key}${isOptional ? "?" : ""}: ${zodToTs(shape[key])}`
      })
      .join(";\n\t")

    return `{\n\t${props}\n}`
  }
  if (typeName === "ZodOptional") {
    return `${zodToTs(def.innerType)} | undefined`
  }
  if (typeName === "ZodNullable") {
    return `${zodToTs(def.innerType)} | null`
  }
  if (typeName === "ZodUnion") {
    return def.options.map((opt: any) => zodToTs(opt)).join(" | ")
  }
  if (typeName === "ZodIntersection") {
    return `${zodToTs(def.left)} & ${zodToTs(def.right)}`
  }
  if (typeName === "ZodEnum") {
    const values = def.values || Object.keys(def.entries)
    return values.map((v: string) => `"${v}"`).join(" | ")
  }
  if (typeName === "ZodLiteral") {
    const val = def.value !== undefined ? def.value : (def.values && def.values[0])
    return typeof val === "string" ? `"${val}"` : String(val)
  }
  if (typeName === "ZodDefault") {
    return zodToTs(def.innerType)
  }

  return "any"
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function camelCase(s: string) {
  const u = s
    .replace(/[\W_]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^[\W_]+/, "")
    .replace(/\/$/, "")
  return `${u[0].toLowerCase()}${u.slice(1)}`
}

const isQuery = <T>(x: any): x is Query<any> => {
  if (typeof x !== "object" || x === null) {
    return false
  }
  return "limit" in x && "condition" in x
}

function isSdkOptional(schema: ZodType<any, any, any>): boolean {
  const def = schema._def as any
  const typeName = def?.typeName || (def?.type ? `Zod${capitalize(def.type)}` : "ZodAny")
  
  if (typeName === "ZodOptional") return true
  if (typeName === "ZodDefault") return isSdkOptional(def.innerType)
  if (typeName === "ZodNullable") return isSdkOptional(def.innerType)
  
  return false
}

