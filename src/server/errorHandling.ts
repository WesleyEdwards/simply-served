export class NotFoundError extends Error {
  status: number
  constructor(message = "Not Found") {
    super(message)
    this.status = 404
  }
}

export class InternalServerError extends Error {
  status: number
  constructor(message = "Internal Server Error") {
    super(message)
    this.status = 500
  }
}

export class InvalidRequestError extends Error {
  status: number
  constructor(message = "Invalid Request") {
    super(message)
    this.status = 400
  }
}
export class ParseError extends Error {
  status: number
  constructor(message = "Invalid Request", status = 400) {
    super(message)
    this.status = status
  }
}
