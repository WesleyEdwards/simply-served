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

  test("NotEqual condition", () => {
    expect(conditionToFilter({NotEqual: "testValue"})).toMatchObject({
      $ne: "testValue",
    })
    expect(conditionToFilter({NotEqual: 42})).toMatchObject({$ne: 42})
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

  test("StringContains condition - case sensitive", () => {
    const result = conditionToFilter({
      StringContains: {value: "hello", ignoreCase: false},
    })
    expect(result).toMatchObject({$regex: "hello"})
    expect(result).not.toHaveProperty("$options")
  })

  test("StringContains condition - case insensitive", () => {
    const result = conditionToFilter({
      StringContains: {value: "hello", ignoreCase: true},
    })
    expect(result).toMatchObject({$regex: "hello", $options: "i"})
  })

  test("StringContains escapes special regex characters", () => {
    const result = conditionToFilter({
      StringContains: {value: "test.*value", ignoreCase: false},
    })
    // Special chars should be escaped
    expect(result).toMatchObject({$regex: "test\\.\\*value"})
  })

  test("StringContains escapes all special characters", () => {
    const result = conditionToFilter({
      StringContains: {value: "a]b[c(d)e{f}g^h$i.j*k+l?m|n\\o", ignoreCase: false},
    })
    expect(result.$regex).toBe("a\\]b\\[c\\(d\\)e\\{f\\}g\\^h\\$i\\.j\\*k\\+l\\?m\\|n\\\\o")
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
