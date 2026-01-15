import { Method } from "types";

export declare type Fetcher = <Body, T>(path: string, method: Method, body?: Body) => Promise<T>;