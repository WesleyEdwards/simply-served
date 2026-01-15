
// Auto-generated SDK
import {Query, Fetcher, Method, Modification} from "simply-served-client";

export type User = {
	_id: string;
	name: string
}
export type Todo = {
	_id: string;
	todoItem: string;
	owner: string;
	done: boolean
}



export interface Api {
  readonly user: {
    detail: (id: string) => Promise<User>
    query: (body: Query<User>) => Promise<User[]>
    insert: (body: User) => Promise<any>
    modify: (id: string, body: Modification<User>) => Promise<User>
    delete: (id: string) => Promise<User>
  }
  readonly todo: {
    detail: (id: string) => Promise<Todo>
    query: (body: Query<Todo>) => Promise<Todo[]>
    insert: (body: Todo) => Promise<any>
    modify: (id: string, body: Modification<Todo>) => Promise<Todo>
    delete: (id: string) => Promise<Todo>
    myTodos: () => Promise<any>
  }
}



export class LiveApi implements Api {
  constructor(private fetcher: Fetcher) {}
  user: Api["user"] = {
    detail: (id: string) => this.fetcher(`/user/detail/${id}`, "GET"),
    query: (body: Query<User>) => this.fetcher(`/user/query`, "POST", body),
    insert: (body: User) => this.fetcher(`/user/insert`, "POST", body),
    modify: (id: string, body: Modification<User>) => this.fetcher(`/user/modify/${id}`, "PUT", body),
    delete: (id: string) => this.fetcher(`/user/${id}`, "DELETE")
  }
  todo: Api["todo"] = {
    detail: (id: string) => this.fetcher(`/todo/detail/${id}`, "GET"),
    query: (body: Query<Todo>) => this.fetcher(`/todo/query`, "POST", body),
    insert: (body: Todo) => this.fetcher(`/todo/insert`, "POST", body),
    modify: (id: string, body: Modification<Todo>) => this.fetcher(`/todo/modify/${id}`, "PUT", body),
    delete: (id: string) => this.fetcher(`/todo/${id}`, "DELETE"),
    myTodos: () => this.fetcher(`/todo/my-todos`, "GET")
  }
}
