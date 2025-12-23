import request from "supertest"
import {getMockServer} from "../mocks/server"

const mockServer = getMockServer()

describe("Attempt invalid jwt", () => {
  it("Unsuccessful", async () => {
    const badResponse = await request(mockServer)
      .delete("/todo/5de0ee99-d552-4686-aafc-9895c5782071")
      .set("Authorization", "Bearer invalid-jwt")
      .send()
    expect(badResponse.statusCode).toBe(401)
  })
})
