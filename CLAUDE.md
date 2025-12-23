# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

This is a TypeScript monorepo using npm workspaces:
- **packages/simply-served/**: Core server framework (npm package)
- **packages/client/**: Client SDK module for consuming generated APIs
- **packages/example/**: Example application demonstrating the framework

## Build Commands

```bash
# From repository root
npm install              # Install all workspace dependencies
npm run build            # Build all packages
npm run test             # Run tests for simply-served

# Individual packages
npm run build --workspace=packages/simply-served
npm run build --workspace=packages/client
npm run start --workspace=packages/example    # Run example dev server
```

### Running a Single Test
```bash
npm run test --workspace=packages/simply-served -- tests/condition.test.ts
npm run test --workspace=packages/simply-served -- --testNamePattern="test name"
```

## Architecture Overview

Simply Served is a lightweight Express.js-based framework that auto-generates REST endpoints from model definitions with built-in permission handling.

### Core Modules (packages/simply-served/src/)

**endpoints/** - REST API generation
- `modelRestEndpoints`: Auto-generates CRUD endpoints (GET /detail/:id, POST /insert, POST /query, PUT /modify/:id, DELETE /:id)
- `buildRoute`: Fluent API for custom route building

**condition/** - Database-agnostic query system (inspired by MongoDB query language)
- Generic condition types: Equal, GreaterThan, Inside, Or, And, ListAnyElement, StringContains
- `evalCondition`: Evaluates conditions against objects in memory
- Conditions are translated to database-specific queries by adapters

**server/** - Express middleware and controller system
- `addController`: Registers routes with optional authentication
- `DbMethods<T>`: Abstract interface for database operations (findOneById, findOne, findMany, insertOne, updateOne, deleteOne)

**mongo/** - MongoDB adapter
- Implements DbMethods interface
- `conditionToFilter`: Translates generic Condition objects to MongoDB filters

**ram-unsafe/** - In-memory database adapter for development/testing
- `persistentDb`: RAM-based data store implementing DbMethods

**auth/** - Authentication and authorization
- `bearerTokenMiddleware`: JWT token handling with encryption
- `verifyAuth`: Token verification utilities

**meta/** - SDK generation
- `sdkGenerator`: Auto-generates TypeScript client SDKs from endpoint metadata

### Permission System

Four permission types for CRUD operations:
- `publicAccess`: No authentication required
- `authenticated`: Any authenticated user
- `modelAuth`: Condition-based permissions (check function returns a Condition)
- `notAllowed`: Blocks access

### Key Patterns

**Model Definition:**
```typescript
modelRestEndpoints({
  validator: z.object({ _id: z.uuid(), ... }),  // Zod schema
  collection: (db) => db.collection,
  permissions: { read, create, modify, delete },
  actions: { prepareResponse, interceptCreate, postCreate, ... }  // Optional hooks
})
```

**Custom Routes:**
```typescript
buildRoute<ServerCtx>("get")
  .path("/custom-path")
  .withAuth()
  .build(async (req, res, auth) => { ... })
```

**Server Context Pattern:**
```typescript
type Db = { user: DbMethods<User> }
type ServerCtx = { db: Db; auth: User }
```

## Dependencies

- **Required**: express ^5.0.0, zod 4.0.5, uuid
- **Optional peers**: mongodb ^6.14.2, jsonwebtoken ^9.0.2, node-mailjet ^6.0.9

## Formatting

Uses Prettier with: 80 char width, 2 space tabs, no semicolons, double quotes, ES5 trailing commas.
