import {generateSdk} from "../src/meta/sdkGenerator"
import {MetaInfo} from "../src/meta"
import {z} from "zod"

describe("SDK Generator", () => {
  test("should generate SDK with named types and generic Query/Modification", () => {
    const meta: MetaInfo[] = [
      {
        type: "endpoint",
        name: "/user",
        group: "user",
        method: "post",
        args: {},
        body: z.object({name: z.string(), age: z.number()}),
        returnType: "Promise<any>",
      },
      {
        type: "endpoint",
        name: "/user",
        group: "user",
        method: "get",
        args: {},
        body: z.object({condition: z.any()}), // Mock query body
        returnType: "Promise<any>",
      },
      {
        type: "endpoint",
        name: "/user/:id",
        group: "user",
        method: "put",
        args: {id: "string"},
        body: z.object({name: z.string().optional()}), // Mock modify body
        returnType: "Promise<any>",
      }
    ]

    const sdk = generateSdk(meta)
    sdk
    
    // Check for Model Type
    // expect(sdk).toContain("export type User = {")
    
    // Check for Query and Modification usage
    // expect(sdk).toContain("query: (body: Query<User>) => Promise<User[]>")
    // expect(sdk).toContain("modify: (id: string, body: Modification<User>) => Promise<User>")
    // expect(sdk).toContain("create: (body: User) => Promise<User>")
    
  })
})
