import { test } from "node:test";
import assert from "node:assert/strict";
import { combineValues } from "../module/rules/five-addition.mjs";

test("five-step addition rounds only at the final result and is order-independent", () => {
  assert.equal(combineValues([0, 20]), 20);
  assert.equal(combineValues([0, 0, 20]), 21);
  assert.equal(combineValues([20, 0, 0]), 21);
});
