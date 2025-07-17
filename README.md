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
[👉 Example Server on GitHub](https://github.com/WesleyEdwards/simply-served-example)

```typescript
type User = {_id: string; name: string}
type Db = {user: DbMethods<User>}

const server = createSimplyServer<{db: Db; auth: User}>({
  initContext: {
    db: persistentDb({
      user: [{_id: "1", name: "John Doe"}],
    }),
  },
  getAuth: bearerTokenAuth("super-secret-encryption-key"),
  controllers: [
    {
      path: "/user",
      routes: modelRestEndpoints({
        validator: z.object({
          _id: z.uuid(),
          name: z.string(),
        }),
        collection: (db) => db.user,
        permissions: {
          create: {type: "publicAccess"},
          read: {type: "publicAccess"},
          modify: {
            type: "modelAuth",
            check: ({_id}) => ({_id: {Equal: _id}}),
          },
          delete: {type: "notAllowed"},
        },
      }),
    },
  ],
})

const app = express()
server.generateEndpoints(app)
app.listen()
```
