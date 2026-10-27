import { test } from "node:test";
import assert from "node:assert/strict";
import { formatAttackResult, resolveAttack } from "../module/rules/combat.mjs";
import { buildAttackCard } from "../module/rules/roll-card.mjs";

test("roll card: fractional head armour shows its deduction and zero damage", () => {
  const weapon = { type: "weapon", name: "Test gun", system: { rangeModifier: 0, skill: "Geschosswaffen", bep: 6 } };
  const attacker = {
    system: {
      weapon: { selected: "weapon" },
      skills: { Geschosswaffen: { value: 20 } },
      health: {}
    },
    items: new Map([["weapon", weapon]])
  };
  const target = { system: { health: {}, armor: { head: { battered: 11.6 } } } };
  const originalRandom = Math.random;

  try {
    Math.random = () => 0; // n5 is zero; the aimed zone is deterministic.
    const outcome = resolveAttack({
      attacker,
      target,
      skillKey: "Geschosswaffen",
      bonus: 0.1,
      aimZones: ["head"]
    });
    const card = buildAttackCard(outcome);

    assert.equal(formatAttackResult(outcome), "3.1");
    assert.deepEqual(
      { zone: outcome.zone, rawDamage: outcome.rawDamage, damage: outcome.damage },
      { zone: "head", rawDamage: 6.62, damage: 0 }
    );
    assert.deepEqual(card.damage, {
      title: "Damage",
      formula: "3.1 / 5 + 6 (BEP) - 11.6 (head)",
      result: "0 damage"
    });
  } finally {
    Math.random = originalRandom;
  }
});

test("damage rounds only after BEP and fractional armour are applied", () => {
  const weapon = { type: "weapon", name: "Test gun", system: { rangeModifier: 0, skill: "Geschosswaffen", bep: 0 } };
  const attacker = {
    system: {
      weapon: { selected: "weapon" },
      skills: { Geschosswaffen: { value: 27 } },
      health: {}
    },
    items: new Map([["weapon", weapon]])
  };
  const target = { system: { health: {}, armor: { torso: { battered: 0.6 } } } };
  const originalRandom = Math.random;

  try {
    Math.random = () => 0;
    const outcome = resolveAttack({ attacker, target, skillKey: "Geschosswaffen" });

    assert.equal(outcome.result, 27);
    assert.equal(outcome.damage, 5);
    assert.equal(
      buildAttackCard(outcome).damage.formula,
      "27 / 5 + 0 (BEP) - 0.6 (torso)"
    );
  } finally {
    Math.random = originalRandom;
  }
});

test("roll card: a miss has no damage section", () => {
  const card = buildAttackCard({
    hit: false,
    skillVal: 0,
    damagePen: 0,
    bonus: 0,
    distPen: 0,
    aimPen: 0,
    roll: { plus: 0, minus: 0 }
  });

  assert.equal(card.damage, null);
});
