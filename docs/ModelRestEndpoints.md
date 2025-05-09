# Model Rest Endpoints

## Overview

Model Rest Endpoints are auto-generated REST endpoints for a given model.

## Purpose

Rather than defining REST endpoints manually, by auto-generating them, development is much quicker. When generating these endpoints, the developer must provide a definition of the CRUD permissions for each model.

## Core Functionality

the `modelRestEndpoints` function generates REST endpoints for a given model. The function signature is as follows:

```typescript
function modelRestEndpoints<C extends ServerContext, T extends HasId>(
  builderInfo: BuilderParams<C, T>
): Route<C, any, boolean>[]
```

In the context of a server, defining rest endpoints could look like this:

```typescript
import {z} from "zod"

const todoRestRoutes = modelRestEndpoints<Ctx, Todo>({
  // Getter for the collection
  collection: (db: Ctx["db"]) => db.todo,
  // Model validation schema
  validator: z.object({
    _id: z.string().uuid(),
    todoItem: z.string(),
    owner: z.string().uuid(),
    done: z.boolean().default(true),
  }),
  // CRUD permissions
  permissions: {
    create: { type: "publicAccess" },
    read: { type: "authenticated" },
    modify: { type: "authenticated" },
    delete: { type: "notAllowed" },
  },
})
```

In this example, the `todoRestRoutes` variable will contain an array of routes that can be used to interact with the `Todo` model. A typescript definition of the generated endpoints that can be called would be:

Here's a definition of the http requests that can be made to the generated endpoints:

- `GET /:id` - Get item by id
- `POST /insert` - Create a new todo item (body must be a valid instance of `T`)
- `POST /query` - Query for items (body must be a valid `Query<T>`)
- `PUT /:id` - Update by id (body must be a valid `Partial<T>`)
- `DELETE /:id` - Delete by id

## Permissions

A valid `ModelPermissions` object must be provided to the `permissions` field. This defines the CRUD operations a user can perform on a model. A `ModelPermOption` definition for each CRUD operation must be defined.

```typescript
type ModelPermOption<C extends ServerContext, T> =
  | {type: "publicAccess"}
  | {type: "notAllowed"}
  | {type: "authenticated"}
  | {type: "modelAuth"; check: (auth: C["auth"]) => Condition<T>}
```

A description of each type in the Union type `ModelPermOption` is as follows:

### Public Access (`publicAccess`)

- Anyone (authenticated or unauthenticated) can perform the action.

Example:

```typescript
const permissions: ModelPermissions<Ctx, T> = {
  // Anyone can read all instances of 'T'
  read: { type: "publicAccess" },
  create: ...
}
```

### Not Allowed(`notAllowed`)

- The operation is not allowed for any user.

### Authenticated (`authenticated`)

- Any Authenticated user can perform the action

### Model Auth (`modelAuth`)

- Permissions based on the instance of the model being operated on.

- Developers can define whether an authenticated user can perform a certain action on a model based on the relationship between the user and the model its self.
- The `check` function allows you to provide a function that generates a condition based on a user's authentication.

For Example, given the following model, this would be a valid permission definition:

```typescript
type Todo = {
  id: number
  owner: number
  public: boolean
}

const permissions: ModelPermissions<Ctx, Todo> = {
  read: {
    type: "modelAuth",
    check: (auth) => {
      if (auth.isAdmin) {
        return { Always: true }
      } else {
        return { Or: [
          { owner: { Equal: auth.userId } }
          { public: { Equal: true } }
        ] }
      }
    }
  },
  create: {
    modelAuth: (auth) => ({ owner: { Equal: auth.userId } })
  },
  ...
}

```

The above example would allow the following:

- Admins to read any Todo in the system
- Users to read their own todos
- Any user to read todos with `public: true`
- Any user to create a Todo, while verifying that the `Todo` they are creating is owned by themselves.
