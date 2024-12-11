import {z} from "zod"
import {Condition} from "../condition/condition"
import {Animal, animalSchema, AnimalType} from "./mocks"
import {createConditionSchema} from "../condition/conditionSchema"

describe("assures the correct schema is created from `createConditionSchema`", () => {
  const stringSchema = createConditionSchema(z.string())
  const stringSchemaParse = (b: any) => stringSchema.safeParse(b)

  const successAndMatchObj = (b: any) =>
    expect(stringSchemaParse(b)).toMatchObject({
      success: true,
      data: b
    })

  const unSuccessful = (b: any) =>
    expect(stringSchemaParse(b).success).toBe(false)

  test("Invalid input", () => {
    unSuccessful("")
    unSuccessful(4)
    unSuccessful(null)
    unSuccessful([])
    unSuccessful(() => {})
  })

  test("Always & Never", () => {
    successAndMatchObj({Always: true})
    successAndMatchObj({never: true})

    unSuccessful({Always: false})
    unSuccessful({never: false})
    unSuccessful({Always: {}})
    unSuccessful({never: 3})
  })

  test("Equal", () => {
    successAndMatchObj({Equal: ""})
    successAndMatchObj({Equal: "asdf"})

    unSuccessful({Equal: 3})
    unSuccessful({Equal: null})
    unSuccessful({Equal: undefined})
  })

  test("Inside", () => {
    successAndMatchObj({Inside: []})
    successAndMatchObj({Inside: [""]})
    successAndMatchObj({Inside: ["asdf", "", "foo"]})

    unSuccessful({Inside: ["asdf", "", 34]})
    unSuccessful({Inside: [3]})
    unSuccessful({Inside: [null]})
    unSuccessful({Inside: [undefined]})
    unSuccessful({Inside: {key: "undefined"}})
  })

  const validStringConditions = [
    {Always: true},
    {never: true},
    {Equal: ""},
    {Equal: "asdf"},
    {Inside: []},
    {Inside: ["asdf", "", "foo"]}
  ]
  const invalidStringConditions = [
    {Always: false},
    {never: false},
    "",
    [3],
    {},
    {Inside: ["asdf", "", 34]},
    [undefined],
    {key: "undefined"},
    {Equal: {key: "undefined"}}
  ]

  test("ListAnyElement", () => {
    for (const valid of [...validStringConditions, invalidStringConditions]) {
      unSuccessful({ListAnyElement: valid})
    }
  })

  test("Or", () => {
    for (const valid of validStringConditions) {
      successAndMatchObj({Or: [valid]})
    }
    for (const invalid of invalidStringConditions) {
      unSuccessful({Or: [invalid]})
    }
    successAndMatchObj({Or: validStringConditions})
    successAndMatchObj({Or: [{Or: validStringConditions}]})
    successAndMatchObj({Or: [{Or: [{Or: validStringConditions}]}]})
    successAndMatchObj({Or: [{Or: [{Or: [{Always: true}]}]}]})
  })
  test("And", () => {
    for (const valid of validStringConditions) {
      successAndMatchObj({And: [valid]})
    }
    for (const invalid of invalidStringConditions) {
      unSuccessful({And: [invalid]})
    }
    successAndMatchObj({And: validStringConditions})
    successAndMatchObj({And: [{And: validStringConditions}]})
    successAndMatchObj({And: [{And: [{And: validStringConditions}]}]})
    successAndMatchObj({And: [{And: [{And: [{Always: true}]}]}]})
  })
})

describe("assures the correct schema is created from `createConditionSchema` with objects", () => {
  const animalParseSchema = (b: any) =>
    createConditionSchema(animalSchema).safeParse(b)

  const successAndMatchObj = (b: any) =>
    expect(animalParseSchema(b)).toMatchObject({
      success: true,
      data: b
    })

  const unSuccessful = (b: any) =>
    expect(animalParseSchema(b).success).toBe(false)

  test("Invalid input", () => {
    const validAnimalConditions: Condition<Animal>[] = [
      {Always: true},
      {_id: {Equal: "1234"}},
      {age: {Equal: 4}},
      {type: {Inside: [AnimalType.Mammal]}},
      {parents: {ListAnyElement: {gender: {Equal: "Male"}}}},
      {parents: {ListAnyElement: {Always: true}}},
      {parents: {ListAnyElement: {name: {Equal: "Bella"}}}},
      {
        parents: {
          ListAnyElement: {
            And: [{gender: {Equal: "Male"}}, {_id: {Inside: ["123-father"]}}]
          }
        }
      }
    ]
    for (const c of validAnimalConditions) {
      successAndMatchObj(c)
    }
    const invalidAnimalConditions = [
      {Always: false},
      {_id: {Inside: "1234"}},
      {ageIncorrect: {Equal: 4}},
      {type: {Inside: [3]}},
      {parents: {ListAnyElement: {gender: {Equal: 3}}}},
      {parents: {age: {Always: true}}},
      {parents: {ListAnyElement: {nameIncorrect: {Equal: "Bella"}}}},
      {
        parents: {
          ListAnyElement: {
            And: [
              {gender: {Equal: "Male"}},
              {_id: {Inside: ["123-father"]}},
              {never: false}
            ]
          }
        }
      }
    ]
    for (const c of invalidAnimalConditions) {
      unSuccessful(c)
    }
  })
})
