import {Fetcher} from "types"

export const basicFetcher =
  (baseUrl: string, headers: () => Promise<Record<string, string>>): Fetcher =>
  async (url: string, method: string, body?: any) => {
    const response = await fetch(`${baseUrl}${url}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(await headers()),
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({message: "An error occurred"}))
      throw new Error(error.message || response.statusText)
    }

    return response.json()
  }
