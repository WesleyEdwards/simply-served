<h1 align="center">Simply Served</h1>

<div align="center">

[![npm latest package](https://img.shields.io/npm/v/simply-served/latest.svg)](https://www.npmjs.com/package/simply-served)  
A lightweight framework accelerate your Node.js server development.

</div>

---

## Overview

**Simply Served** is a lightweight Node.js server framework designed to simplify server development while maintaining flexibility and extensibility.

The framework focuses on enabling developers to:
- Access and manipulate data effortlessly.
- Enforce permissions and maintain data integrity.
- Auto-generate REST endpoints with basic CRUD operations based on models and permissions.

Whether you're building a simple application or a complex API, Simply Served provides the tools you need to speed up development.

---

## Key Features

- **Auto-generated Endpoints**: Define your models and permissions, and let the framework handle the REST endpoints.
- **Database-agnostic**: Use any database by implementing a simple, abstracted interface.
- **Built-in Validation**: Ensure data integrity with Zod, a powerful and extensible schema validation library.
- **Express.js Backbone**: Leverage the flexibility and performance of Express.js under the hood.

---

## Example

Get started with an example server:  
[👉 Example Server on GitHub](https://github.com/WesleyEdwards/simply-served/example)

```typescript
// Basic usage of Simply Served
import { SimplyServer } from "simply-served";

class MyServer extends SimplyServer {
  constructor() {
    super({db: myDatabase, middleware: myMiddleware})
  }
  controllers = {
    user: modelRestEndpoints({
      endpoint: (db) => db.user,
      validator: z.object({
        _id: z.string().uuid(),
        name: z.string()
      }),
      // permissions defining who can do what
      permissions: {
        create: () => ({Always: true}),
        read: () => ({Always: true}),
        modify: ({myUserId}) => ({_id: {Equal: myUserId}}),
        delete: () => ({Never: true})
      }
    })
  }
}
const server = new MyServer()

server.generateEndpoints(app)
```
