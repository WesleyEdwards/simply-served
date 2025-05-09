import {z} from "zod"
import {Animal, animalSchema, AnimalType} from "./mocks"
import {createConditionSchema} from "../src/condition/conditionSchema"
import {Condition} from "../src/condition/condition"

describe("assures the correct schema is created from `createConditionSchema`", () => {
  const stringSchema = createConditionSchema(z.string())
  const stringSchemaParse = (b: any) => stringSchema.parse(b)

  const successAndMatchObj = (b: any) =>
    expect(stringSchemaParse(b)).toMatchObject(b)

  const unSuccessful = (b: any) => {
    return expect(() => stringSchemaParse(b)).toThrow(Error)
  }

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

  test("StringContains", () => {
    successAndMatchObj({StringContains: {value: "", ignoreCase: true}})
    successAndMatchObj({StringContains: {value: "string1", ignoreCase: false}})
    unSuccessful({StringContains: {value: 2, ignoreCase: false}})
    unSuccessful({StringContains: {value: ""}})
    unSuccessful({StringContains: {ignoreCase: true}})
    unSuccessful({StringContains: null})
  })

  const validStringConditions = [
    {Always: true},
    {never: true},
    {Equal: ""},
    {Equal: "asdf"},
    {Inside: []},
    {Inside: ["asdf", "", "foo"]},
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
    {Equal: {key: "undefined"}},
  ]

  test("ListAnyElement", () => {
    for (const valid of [...validStringConditions, invalidStringConditions]) {
      valid
      unSuccessful({ListAnyElement: valid})
    }
  })

  test("Or", () => {
    for (const valid of validStringConditions) {
      successAndMatchObj({Or: [valid]})
    }
    for (const invalid of invalidStringConditions) {
      invalid
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
      invalid
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
    createConditionSchema(animalSchema).parse(b)

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
            And: [{gender: {Equal: "Male"}}, {_id: {Inside: ["123-father"]}}],
          },
        },
      },
    ]
    for (const c of validAnimalConditions) {
      expect(animalParseSchema(c)).toMatchObject(c)
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
              {never: false},
            ],
          },
        },
      },
    ]
    for (const c of invalidAnimalConditions) {
      expect(() => {
        animalParseSchema(c)
      }).toThrow(Error)
    }
  })
})
