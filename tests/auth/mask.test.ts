import {maskKeysBasedOnPerms} from "../../src"
import {Animal, dog_test} from "../mocks"
import {mockCtx, MockCtx} from "../mocks/server"

describe("Verify masking works", () => {
  const dog = {...dog_test}

  it("don't mask any keys", () => {
    const maskFun = maskKeysBasedOnPerms<Animal, MockCtx>(() => ({}))
    expect(maskFun(dog, mockCtx)).toMatchObject(dog_test)
  })

  it("mask name", () => {
    const maskFun = maskKeysBasedOnPerms<Animal, MockCtx>(() => ({name: true}))
    const {name, ...allButName} = dog
    expect(maskFun(dog, mockCtx)).toMatchObject(allButName)
  })

  it("mask based on userId", () => {
    const maskIfUserIdMatches = maskKeysBasedOnPerms<Animal, MockCtx>(
      (_, {auth}) => {
        if (auth?.userId !== mockCtx.auth?.userId) {
          return {name: true}
        }
        return {}
      }
    )
    const {name, ...allButName} = dog
    expect(maskIfUserIdMatches(dog, mockCtx)).toMatchObject(dog)
    expect(
      maskIfUserIdMatches(dog, {...mockCtx, auth: {userId: "other-id"}})
    ).toMatchObject(allButName)
  })
})
