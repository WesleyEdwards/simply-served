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

## Improvements

### Medium Priority

- [ ] **Partial Validator Issue** (`packages/simply-served/src/validation/validation.ts:16`)
  - `schema.partial().strict()` - `.strict()` rejects unknown fields
  - Partial objects might intentionally omit required fields

### Low Priority
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

- [ ] Aggregation pipeline
- [ ] Distinct queries

### Permission System
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

### Authentication
- [ ] Auth Endpoints abstraction
- [ ] Token refresh mechanism

---

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

