import {evalCondition} from "../src/condition/evalCondition"
import {Condition} from "../src/condition/condition"
import {Animal, AnimalType, dog_test} from "./mocks"

// Test Condition system, specifically the typing And 'evalCondition' function
function testCondition<T>(condition: Condition<T>, inputs: [T, boolean][]) {
  inputs.forEach(([input, expected]) => {
    expect(evalCondition(input, condition)).toBe(expected)
  })
}

describe("Never Condition", () => {
  test("should always return false", () => {
    testCondition<any>({Never: true}, [
      ["test", false],
      ["", false],
      [3, false],
      [true, false],
      [null, false],
    ])
  })
})
describe("Always Condition", () => {
  test("should always return true", () => {
    testCondition<any>({Always: true}, [
      ["test", true],
      ["", true],
      [3, true],
      [true, true],
      [null, true],
    ])
  })
})

describe("Equal Condition", () => {
  test("should result in true Or false", () => {
    testCondition({Equal: "test"}, [
      ["test", true],
      ["not", false],
    ])
    testCondition({Equal: ""}, [["", true]])
    testCondition<any>({Equal: 3}, [
      [3, true],
      [12, false],
      ["3", false],
    ])
    testCondition({Equal: true}, [
      [true, true],
      [false, false],
    ])
    testCondition({Equal: null}, [
      [null, true],
      [undefined, false],
    ])
  })
})

test("Inside Condition", () => {
  testCondition({Inside: ["test", "one"]}, [
    ["test", true],
    ["other", false],
  ])
  testCondition({Inside: [1, 2, 3, 3]}, [
    [3, true],
    [1, true],
    [4, false],
  ])
  testCondition({Inside: [false, true]}, [
    [true, true],
    [false, true],
    [null, false],
  ])
  testCondition({Inside: [null, "", 4]}, [
    [null, true],
    [5, false],
  ])
})
test("StringContains", () => {
  testCondition({StringContains: {value: "", ignoreCase: true}}, [
    ["", true],
    ["this", true],
  ])
  testCondition({StringContains: {value: "test", ignoreCase: true}}, [
    ["testing", true],
    ["testings", true],
    ["", false],
    ["tes", false],
  ])
})

test("Or Condition", () => {
  expect(evalCondition("test", {Or: [{Always: true}, {Never: true}]})).toBe(
    true
  )
  expect(evalCondition("test", {Or: [{Never: true}, {Never: true}]})).toBe(
    false
  )
  expect(evalCondition("test", {Or: [{Equal: "test"}]})).toBe(true)
  expect(evalCondition("test", {Or: [{Or: [{Equal: "test"}]}]})).toBe(true)
  expect(evalCondition("test", {Or: []})).toBe(false)
})
test("And Condition", () => {
  expect(evalCondition("test", {And: [{Always: true}, {Always: true}]})).toBe(
    true
  )
  expect(evalCondition("test", {And: [{Always: true}, {Never: true}]})).toBe(
    false
  )
  expect(evalCondition("test", {And: [{Never: true}, {Never: true}]})).toBe(
    false
  )
  expect(evalCondition("test", {And: [{Equal: "test"}]})).toBe(true)
  expect(evalCondition("test", {And: [{And: [{Equal: "test"}]}]})).toBe(true)
  expect(evalCondition("test", {And: []})).toBe(true)
})

describe("Edge Cases", () => {
  test("should return false for an empty condition object", () => {
    expect(evalCondition("test", {} as any)).toBe(false)
  })

  test("should return false for unsupported types", () => {
    expect(evalCondition(Symbol("test"), {Equal: Symbol("test")} as any)).toBe(
      false
    )
  })

  test("should handle non-existent object keys gracefully", () => {
    expect(evalCondition({a: 1}, {b: {Equal: 1}} as any)).toBe(false)
  })
})

describe("Object Key Conditions", () => {
  test("should evaluate nested conditions", () => {
    const condition: Condition<Animal> = {
      parents: {ListAnyElement: {name: {Equal: "Bella"}}},
    }
    expect(evalCondition(dog_test, condition)).toBe(true)
  })

  test("should handle missing nested keys", () => {
    const condition: Condition<Animal> = {
      parents: {ListAnyElement: {name: {Equal: "NotFound"}}},
    }
    expect(evalCondition(dog_test, condition)).toBe(false)
  })

  test("should handle empty array in conditions", () => {
    const condition: Condition<Animal> = {
      parents: {ListAnyElement: {name: {Inside: []}}},
    }
    expect(evalCondition(dog_test, condition)).toBe(false)
  })

  test("various key tests", () => {
    const trueConditions: Condition<Animal>[] = [
      {_id: {Equal: "1234"}},
      {age: {Equal: 4}},
      {type: {Inside: [AnimalType.Mammal]}},
      {parents: {ListAnyElement: {name: {Equal: "Bella"}}}},
      {
        parents: {
          ListAnyElement: {
            And: [{gender: {Equal: "Male"}}, {_id: {Inside: ["123-father"]}}],
          },
        },
      },
    ]

    for (const condition of trueConditions) {
      expect(evalCondition(dog_test, condition)).toBe(true)
    }
  })
})
