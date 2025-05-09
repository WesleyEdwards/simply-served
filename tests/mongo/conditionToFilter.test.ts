import {Condition, conditionToFilter} from "../../src"

describe("Test conditionToFilter", () => {
  test("Always and never condition", () => {
    expect(conditionToFilter<Condition<string>>({Always: true})).toMatchObject(
      {}
    )
    expect(conditionToFilter({Never: true})).toMatchObject({_id: false})
  })

  test("Equal condition", () => {
    expect(conditionToFilter({Equal: "testValue"})).toMatchObject({
      $eq: "testValue",
    })
    expect(conditionToFilter({Equal: 42})).toMatchObject({$eq: 42})
  })

  test("GreaterThan and LessThan conditions", () => {
    expect(conditionToFilter({GreaterThan: 10})).toMatchObject({$gt: 10})
    expect(conditionToFilter({GreaterThanOrEqual: 20})).toMatchObject({
      $gte: 20,
    })
    expect(conditionToFilter({LessThan: 5})).toMatchObject({$lt: 5})
    expect(conditionToFilter({LessThanOrEqual: 15})).toMatchObject({$lte: 15})
  })

  test("Inside condition", () => {
    expect(conditionToFilter({Inside: [1, 2, 3]})).toMatchObject({
      $in: [1, 2, 3],
    })
    expect(conditionToFilter({Inside: ["apple", "banana"]})).toMatchObject({
      $in: ["apple", "banana"],
    })
  })

  test("Or condition", () => {
    expect(
      conditionToFilter({
        Or: [{Equal: "Alice"}, {Equal: "Bob"}],
      })
    ).toMatchObject({
      $or: [{$eq: "Alice"}, {$eq: "Bob"}],
    })
  })

  test("And condition", () => {
    expect(
      conditionToFilter({
        And: [{GreaterThan: 10}, {LessThan: 20}],
      })
    ).toMatchObject({
      $and: [{$gt: 10}, {$lt: 20}],
    })
  })

  test("ListAnyElement condition", () => {
    expect(
      conditionToFilter({
        ListAnyElement: {GreaterThan: 5},
      })
    ).toMatchObject({
      $elemMatch: {$gt: 5},
    })
  })

  test("StringContains condition", () => {
    // TODO
  })

  test("Nested object conditions", () => {
    expect(
      conditionToFilter<{name: string; age: number}>({
        And: [{name: {Equal: "Alice"}}, {age: {GreaterThan: 30}}],
      })
    ).toMatchObject({
      $and: [{name: {$eq: "Alice"}}, {age: {$gt: 30}}],
    })
  })

  test("Complex nested condition", () => {
    expect(
      conditionToFilter<{name: string; age: number}>({
        And: [
          {name: {Equal: "Alice"}},
          {Or: [{age: {GreaterThan: 25}}, {age: {LessThan: 18}}]},
        ],
      })
    ).toMatchObject({
      $and: [
        {name: {$eq: "Alice"}},
        {$or: [{age: {$gt: 25}}, {age: {$lt: 18}}]},
      ],
    })
  })
  test("Inverted And / or", () => {
    expect(
      conditionToFilter<{name: string; age: number}>({
        age: {
          Or: [{GreaterThan: 25}, {LessThan: 18}],
        },
      })
    ).toMatchObject({$or: [{age: {$gt: 25}}, {age: {$lt: 18}}]})
  })
})
