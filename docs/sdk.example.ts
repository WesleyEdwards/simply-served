import {Query} from "simply-served"


type User = {
    _id: string
    name: string
}
type CreateAccount = {
    email: string
    password: string
}
type LoginResponse = {
    token: string
}
type SubmitAuthCode = {
    email: string
    code: string
}
export interface Api {
  readonly auth: {
    createAccount: (body: CreateAccount) => Promise<void>
    sendAuthCode: (body: {email: string}) => Promise<{identifier: string}>
    submitAuthCode: (body: SubmitAuthCode) => Promise<LoginResponse>
    getSelf: () => Promise<User | null>
  }

  readonly user: {
    detail: (id: string) => Promise<User>
    query: (filter: Query<User>) => Promise<User[]>
    create: (body: User) => Promise<User>
    modify: (id: string, mod: Partial<User>) => Promise<User>
    delete: (id: string) => Promise<User>
  }
}
type Method = "GET" | "POST" | "PUT" | "DELETE";
export declare type Fetcher = <Body, T>(path: string, method: Method, body?: Body) => Promise<T>;

export class LiveApi {
 constructor(private fetcher: Fetcher) {}
    auth = {
        createAccount: (body: CreateAccount) => this.fetcher("/auth/create-account", "POST", body),
        sendAuthCode: (body: {email: string}) => this.fetcher("/auth/send-auth-code", "POST", body),
        submitAuthCode: (body: SubmitAuthCode) => this.fetcher("/auth/submit-auth-code", "POST", body),
        getSelf: () => this.fetcher("/auth/get-self", "GET")
    }
    user = {
        detail: (id: string) => this.fetcher(`/user/${id}`, "GET"),
        query: (filter: Query<User>) => this.fetcher("/user", "GET", filter),
        create: (body: User) => this.fetcher("/user", "POST", body),
        modify: (id: string, mod: Partial<User>) => this.fetcher(`/user/${id}`, "PUT", mod),
        delete: (id: string) => this.fetcher(`/user/${id}`, "DELETE")
    }
}