import {DataStore} from "../../src"
import {Todo, TodoDb, User} from "./types"

const todoDb: TodoDb = {
  todo: new DataStore<Todo>([
    {
      _id: "5de0ee99-d552-4686-aafc-9895c5782071",
      done: false,
      owner: "df854171-5e36-47cf-b679-3258a2032b51",
      todoItem: "Pick up Grandma"
    },
    {
      _id: "3ab5c9b0-f7eb-43a5-b465-c3a251df2720",
      done: true,
      owner: "df854171-5e36-47cf-b679-3258a2032b51",
      todoItem: "Make dinner"
    },
    {
      _id: "8fa1be22-c4d7-41c3-8829-df4eb46d5873",
      done: false,
      owner: "7565abf0-c7eb-44b7-a6e4-075e7590bc4d",
      todoItem: "Fix the garage door"
    },
    {
      _id: "2b5c939e-1f7d-4689-a44d-cbfbc7215a24",
      done: true,
      owner: "7565abf0-c7eb-44b7-a6e4-075e7590bc4d",
      todoItem: "Write a report for work"
    },
    {
      _id: "63e5c813-1d56-4202-894e-08bfa445b321",
      done: false,
      owner: "df854171-5e36-47cf-b679-3258a2032b51",
      todoItem: "Buy groceries"
    },
    {
      _id: "9d07347f-226d-47e3-99c6-baa2fc1f43ec",
      done: true,
      owner: "7565abf0-c7eb-44b7-a6e4-075e7590bc4d",
      todoItem: "Prepare meeting slides"
    },
    {
      _id: "7d9c9e1e-bbfb-498e-8560-01dbb6e6f344",
      done: false,
      owner: "df854171-5e36-47cf-b679-3258a2032b51",
      todoItem: "Walk the dog"
    }
  ]),
  user: new DataStore<User>([
    {_id: "df854171-5e36-47cf-b679-3258a2032b51", name: "John Doe"},
    {_id: "7565abf0-c7eb-44b7-a6e4-075e7590bc4d", name: "George Admin"},
    {_id: "d246be99-2c1e-4059-8a02-4b63e4699d42", name: "Alice Johnson"},
    {_id: "e4d8a2e8-371a-48c9-b1f9-85b6efc84ff4", name: "Sophia Smith"}
  ])
}

export default todoDb
