# Simply Served - TODO & Analysis

## Overview

Simply Served is a TypeScript framework that auto-generates REST endpoints from model definitions with built-in permissions. A lightweight alternative to NestJS or LoopBack, focused on eliminating CRUD boilerplate.

---

## Strengths

- **Strong Type Safety** - End-to-end TypeScript with generics. The `Condition<T>` system provides fully type-safe queries.
- **Zero Boilerplate CRUD** - `modelRestEndpoints()` generates 5 endpoints from a single config object.
- **Elegant Permission Model** - Condition-based `modelAuth` approach allows flexible authorization.
- **Auto-Generated SDK** - `/meta/sdk.ts` endpoint serves a TypeScript client that stays in sync with your API.
- **Pluggable Storage** - Clean `DbMethods<T>` interface allows swapping between MongoDB and JSON file-based RAM adapter.

---

## Bugs

### Critical

- [x] **Query Slicing Bug** (`packages/simply-served/src/ram-unsafe/localCollection.ts:38`)
  - `.slice(skip, limit)` should be `.slice(skip, skip + limit)`
  - Breaks pagination completely
  - **FIXED**

### High Priority

- [x] **JWT Handling for Public Routes** (`packages/simply-served/src/auth/verifyAuth.ts`)
  - Invalid tokens throw errors even for `publicAccess` routes if Authorization header is present
  - Should allow unauthenticated requests to proceed for public endpoints
  - **FIXED** - Middleware now sets auth to null for invalid tokens, letting route-level checks decide

- [x] **Weak Error Messages** (`packages/simply-served/src/endpoints/modelRestEndpoints.ts`)
  - Validation failures return generic "Unable to create item" with no field details
  - Zod errors are swallowed instead of returned to client
  - **FIXED** - Error messages now include:
    - Specific item IDs in not found errors
    - 403 status with "Permission denied" for create failures
    - Actual error messages from database operations
    - Proper error handling for modify/delete endpoints

### Medium Priority

- [ ] **Partial Validator Issue** (`packages/simply-served/src/validation/validation.ts:16`)
  - `schema.partial().strict()` - `.strict()` rejects unknown fields
  - Partial objects might intentionally omit required fields

- [x] **No Pagination Validation**
  - Skip/limit can be negative
  - No maximum limit enforcement (potential DoS with huge limit)
  - **FIXED** - Added validation in `createQuerySchema`:
    - `skip`: must be non-negative integer
    - `limit`: must be integer between 1 and max (default 1000)
    - Custom `maxLimit` option supported
    - Defense in depth in `LocalCollection.findMany()`

- [x] **StringContains MongoDB Regex** (`packages/simply-served/src/mongo/conditionToFilter.ts`)
  - Uses `/^regex/gi` flags incorrectly
  - Should use `$options: 'i'` in MongoDB regex syntax
  - **FIXED** - Now uses proper MongoDB syntax:
    - `{$regex: "value", $options: "i"}` for case-insensitive
    - `{$regex: "value"}` for case-sensitive
    - Added `escapeRegex()` to prevent regex injection attacks

### Low Priority

- [ ] **Nested Key Extraction Loop** (`packages/simply-served/src/mongo/conditionToFilter.ts:92-110`)
  - `extractNestedKey()` while(true) loop could hang on circular condition object
  - Add recursion depth limit

- [ ] **JSON Serialization Limitations** (`packages/simply-served/src/ram-unsafe/persistentDb.ts:32`)
  - Stores Date objects as strings
  - Stores undefined as null
  - Loses type information

- [ ] **Mask Function Type Safety** (`packages/simply-served/src/auth/mask.ts:27`)
  - `@ts-ignore` on assignment to partial object
  - Should use `Pick<T, K>` instead

---

## Missing Features

### Query System

- [x] Sorting/ordering support - **ADDED**
  - `Query<T>` now includes optional `sort: Sort<T>[]`
  - Supports multiple fields with `asc`/`desc` order
  - Schema validates field names against model
  - `LocalCollection.findMany()` implements sorting
- [ ] Aggregation pipeline
- [ ] Distinct queries
- [ ] Count queries

### Permission System

- [ ] Field-level permissions (currently only document-level)
- [ ] Role-based access control (RBAC)
- [ ] Permission inheritance
- [ ] Audit logging for permission denials

### API Features

- [ ] Request/response middleware hooks
- [ ] Global error handler
- [ ] Request logging
- [ ] Rate limiting

### SDK Features

- [ ] Request cancellation
- [ ] Offline support
- [ ] Caching layer

### Database Features

- [ ] Transaction support
- [ ] Migrations/schema versioning
- [ ] Connection pooling abstraction
- [ ] Index hints/support

### Authentication

- [ ] Token refresh mechanism
- [ ] Stronger auth code generation (use `crypto.randomBytes()`)

---

## Suggested Improvements

### High Priority

1. **Improve error propagation** - Return Zod validation errors to clients:
   ```typescript
   const result = validator.safeParse(body)
   if (!result.success) {
     return res.status(400).json({ errors: result.error.flatten() })
   }
   ```

4. **Add integration tests** - Current tests are unit-level only:
   - Full request/response cycle tests
   - Permission denial tests
   - Authentication flow tests
   - Error handling tests

### Medium Priority

5. **Add sorting to queries**:
   ```typescript
   type Query<T> = {
     condition: Condition<T>
     skip?: number
     limit?: number
     sort?: { field: keyof T; order: "asc" | "desc" }
   }
   ```

6. **Cache SDK generation** - Currently regenerates on every request to `/meta/sdk.ts`

7. **Add middleware hooks** - `beforeRequest`/`afterResponse` pattern for logging, rate limiting, etc.

8. **Consolidate metadata management** - Routes currently have metadata set in multiple places (buildRoute, addController, withBody)

### Low Priority

9. **Add pagination guards**:
   ```typescript
   const safeSkip = Math.max(0, skip ?? 0)
   const safeLimit = Math.min(Math.max(1, limit ?? 100), MAX_LIMIT)
   ```

10. **Improve JWT error handling** - Don't throw on invalid token for public routes

---

## Test Coverage Gaps

### Missing Test Suites

- [x] Integration tests (full request/response cycles) - **ADDED** `errorHandling.test.ts`
- [ ] MongoDB integration tests (real queries, not just snapshots)
- [ ] Concurrent access tests for RAM DB
- [ ] SDK generation tests against real endpoints
- [ ] Authentication success flow tests
- [x] Permission denial end-to-end tests - **ADDED** in `errorHandling.test.ts`
- [x] Error handling tests (validation, malformed requests) - **ADDED** in `errorHandling.test.ts`
- [ ] Field masking integration tests

---

## Target Use Cases

### Good For

- Rapid prototyping
- Admin dashboards
- CRUD-heavy applications
- Educational projects
- Small teams

### Not Suitable For (Currently)

- High-traffic production systems
- Complex queries/reporting
- Multi-tenant systems
- Applications needing transactions
- Systems with complex authorization logic
