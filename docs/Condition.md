# Condition System Documentation

## Overview

This document describes the condition evaluation system used in this server framework. The condition system is inspired by MongoDB's query language. The primary goal of this system is to allow flexible condition checking for various types of data, supporting logical operations, comparisons, and nested conditions.

## Purpose

By using this condition system opposed to MongoDB's query language (or something analogous), database-specific logic is abstracted, which decouples server logic from the database.

As of now, **simply-served** includes a [MongoDB driver](https://github.com/WesleyEdwards/simply-served/tree/main/docs/databases), which translates conditions into MongoDB queries. Similarly, it includes a [RAM driver](https://github.com/WesleyEdwards/simply-served/tree/main/docs/databases), which uses a database in memory.

## Core Functionality

Conditions are represented using JSON objects, each object containing a single key. These conditions evaluate whether a given `item` meets the criteria to match against. The `evalCondition` function evaluates whether an item matches that criteria

```typescript
export function evalCondition<T>(item: T, condition: Condition<T>): boolean;
```
Multiple logical operations are supported, such as `And`, `Or`, and nested evaluations.

## Condition Types

The `Condition<T>` object supports the following properties:

### 1. `Never`
- **Description**: Always evaluates to `false`.
- **Example**:
  ```typescript
  const condition = { Never: true };
  evalCondition(42, condition); // false
  ```

### 2. `Always`
- **Description**: Always evaluates to `true`.
- **Example**:
  ```typescript
  const condition = { Always: true };
  evalCondition(42, condition); // true
  ```

### 3. `Equal`
- **Description**: Evaluates to `true` if the `item` is strictly equal to the specified value.
- **Example**:
  ```typescript
  const condition = { Equal: 42 };
  evalCondition(42, condition); // true
  evalCondition(43, condition); // false
  ```

### 4. `Inside`
- **Description**: Evaluates to `true` if the `item` is equal to any value in the specified array.
- **Example**:
  ```typescript
  const condition = { Inside: [1, 42, 100] };
  evalCondition(42, condition); // true
  evalCondition(50, condition); // false
  ```

### 5. `Or`
- **Description**: Evaluates to `true` if at least one sub-condition evaluates to `true`.
- **Example**:
  ```typescript
  const condition = { Or: [{ Equal: 42 }, { Equal: 100 }] };
  evalCondition(42, condition); // true
  evalCondition(100, condition); // true
  evalCondition(50, condition); // false
  ```

### 6. `And`
- **Description**: Evaluates to `true` if all sub-conditions evaluate to `true`.
- **Example**:
  ```typescript
  const condition = { And: [{ Equal: 42 }, { Inside: [42, 100] }] };
  evalCondition(42, condition); // true
  evalCondition(100, condition); // false
  ```

### 7. `ListAnyElement`
- **Description**: Evaluates to `true` if any element in an array satisfies the specified sub-condition.
- **Example**:
  ```typescript
  const condition = { ListAnyElement: { Equal: 42 } };
  evalCondition([10, 42, 100], condition); // true
  evalCondition([10, 20, 30], condition); // false
  ```

### 8. Nested Conditions
- **Description**: Evaluates nested object conditions.
- **Example**:
  ```typescript
  const condition = { name: { Equal: "Alice" } };
  evalCondition({ name: "Alice", age: 25 }, condition); // true
  evalCondition({ name: "Bob", age: 25 }, condition); // false
  ```

## Error Handling

### Invalid Conditions
Common pitfalls while constructing conditions include the folowing:
- `item` is not an array when a `ListAnyElement` condition is used.
  ```typescript
  const condition = { ListAnyElement: { Equal: 42 } };
  evalCondition(42, condition); // Throws Error: "Invalid condition"
  ```
  - Incorrect data type
  ```typescript
  const condition: Condition<number> = { Equal: "not a number" } // Invalid condition
  ```
  - Too many keys in nested object condition. In order to not cause confusion between `And` and `Or` condition criteria, each object condition may only have **one** key. Instead, use the `And` or `Or` condition.
  ```typescript
  const condition = { name: { Equal: "Alice" } }
  ```
  

## Utility Functions

### `areEqual`
The `Inside` condition relies on a utility function `areEqual` for comparing values. This can be customized to support deep equality checks if necessary.

## Examples

### Simple Equality Check
```typescript
const condition = { Equal: "Hello" };
evalCondition("Hello", condition); // true
evalCondition("World", condition); // false
```

### Combining Conditions
```typescript
const condition = {
  Or: [
    { Equal: "Alice" },
    { And: [
      { Equal: "Bob" },
      { Inside: ["Admin", "Editor"] }
    ] }
  ]
};

evalCondition("Alice", condition); // true
evalCondition("Bob", condition); // false
```

### Complex Nested Conditions
```typescript
const condition = {
  name: { Equal: "Alice" },
  roles: { ListAnyElement: { Equal: "Admin" } }
};

evalCondition({ name: "Alice", roles: ["User", "Admin"] }, condition); // true
evalCondition({ name: "Alice", roles: ["User"] }, condition); // false
```

## Usage

Conditions are used to make requests to the server, for example, to find all users named "John", the body of  following query could be made:
```typescript
const users: User[] = await fetch(`${API_URL}/users/query`, {
  method: "POST",
  headers: { ... },
  body: JSON.stringify({
    condition: {
      name: {Equal: "John"}
    }
  })
}).then((res) => res.json())
```