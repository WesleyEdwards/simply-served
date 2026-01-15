import { evalCondition } from "./evalCondition";

describe("evalCondition (client)", () => {
  test("Equal", () => {
    expect(evalCondition(1, { Equal: 1 })).toBe(true);
    expect(evalCondition(1, { Equal: 2 })).toBe(false);
  });

  test("NotEqual", () => {
    expect(evalCondition(1, { NotEqual: 2 })).toBe(true);
    expect(evalCondition(1, { NotEqual: 1 })).toBe(false);
    expect(evalCondition({ a: 1 }, { NotEqual: { a: 2 } })).toBe(true);
    expect(evalCondition({ a: 1 }, { NotEqual: { a: 1 } })).toBe(false);
  });

  test("Not", () => {
    expect(evalCondition(1, { Not: { Equal: 2 } })).toBe(true);
    expect(evalCondition(1, { Not: { Equal: 1 } })).toBe(false);
  });
});
