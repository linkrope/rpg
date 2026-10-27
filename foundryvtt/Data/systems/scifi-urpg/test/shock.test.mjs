import { test } from "node:test";
import assert from "node:assert/strict";
import { applyShockOutcome, shouldRollShock } from "../module/rules/shock.mjs";

test("an unconscious status prevents another Shock roll", () => {
  assert.equal(shouldRollShock({ statuses: new Set(["unconscious"]) }), false);
  assert.equal(shouldRollShock({ statuses: new Set() }), true);
});

test("removing the unconscious status makes Shock eligible again", () => {
  assert.equal(
    shouldRollShock({ system: { health: { unconscious: true } }, statuses: new Set() }),
    true
  );
  assert.equal(
    shouldRollShock({ system: { health: { unconscious: false } }, statuses: new Set(["unconscious"]) }),
    false
  );
});

test("a failed Shock applies Foundry's unconscious status once", async () => {
  const toggles = [];
  const actor = {
    toggleStatusEffect: async (...args) => { toggles.push(args); }
  };

  await applyShockOutcome(actor, { conscious: false });

  assert.deepEqual(toggles, [["unconscious", { active: true }]]);
});
