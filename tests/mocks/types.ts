import {DbQueries} from "../../src"

export type Todo = {
  _id: string
  todoItem: string
  owner: string
  done: boolean
}

export type User = {
  _id: string
  name: string
}

export type TodoDb = {
  todo: DbQueries<Todo>
  user: DbQueries<User>
}
