import { test } from "node:test";
import assert from "node:assert/strict";
import { skillRollFormula } from "../module/rules/skills.mjs";

test("combined skill roll formula shows only the combined skill value", () => {
  const contributions = [
    { value: 20, damage: 2, adjustedValue: 18 },
    { value: 18, damage: 0, adjustedValue: 18 }
  ];
  const roll = { plus: 4, minus: 1 };
  const formula = skillRollFormula(contributions, roll);

  assert.equal(formula, "23 + (4 - 1) (n5)");
  assert.doesNotMatch(formula, /20|18|damage|⊕/);
});
