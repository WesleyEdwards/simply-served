import {z} from "zod"

export enum AnimalType {
  Mammal = "Mammal",
  Reptile = "Reptile"
}
export type Animal = z.infer<typeof animalSchema>

export const animalSchema = z.object({
  _id: z.string(),
  type: z.enum([AnimalType.Mammal, AnimalType.Reptile]),
  gender: z.union([z.literal("Male"), z.literal("Female")]),
  name: z.string(),
  age: z.number(),
  pastOwners: z.string().array(),
  parents: z
    .object({
      _id: z.string(),
      name: z.string(),
      gender: z.union([z.literal("Male"), z.literal("Female")])
    })
    .array()
})

export const dog_test: Animal = {
  _id: "1234",
  type: AnimalType.Mammal,
  gender: "Male",
  name: "Fido",
  age: 4,
  pastOwners: ["bob", "ryan", "thomas"],
  parents: [
    {
      _id: "123-mother",
      name: "Bella",
      gender: "Female"
    },
    {
      _id: "123-father",
      name: "Jack",
      gender: "Male"
    }
  ]
}
