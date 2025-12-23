export async function catchError<T>(
    promise: Promise<T>
  ): Promise<[undefined, T] | [Error]> {
    return promise
      .then((res) => [undefined, res] satisfies [undefined, T])
      .catch(async (error) => [error]);
  }
  