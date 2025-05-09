import request from "supertest"
import {getMockServer, TodoType} from "../mocks/server"
import {Query} from "../../src"

const mockServer = getMockServer()

describe("Query", () => {
  it("", async () => {
    const todoQuery: Query<TodoType> = {
      condition: {
        owner: {Equal: "df854171-5e36-47cf-b679-3258a2032b51"},
      },
    }
    const queryRes = await request(mockServer)
      .post("/todo/query")
      .set("Authorization", "Bearer df854171-5e36-47cf-b679-3258a2032b51")
      .send(todoQuery)

    expect(queryRes.statusCode).toBe(200)
    expect(queryRes.body.length).toBe(4)
  })
})
