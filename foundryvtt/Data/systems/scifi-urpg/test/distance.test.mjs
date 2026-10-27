import { test } from "node:test";
import assert from "node:assert/strict";
import { formatAttackResult, isMeleeAttack, primarilyRangedBonus, rangePenalty, resolveAttack, weaponForActor } from "../module/rules/combat.mjs";
import { tokenDistance } from "../module/rules/distance.mjs";
import { buildAttackCard } from "../module/rules/roll-card.mjs";

test("range penalty uses the five-metre curve and clamps positive modifiers", () => {
  const weapon = { rangeModifier: 0 };
  for (const [distance, expected] of [[0, 0], [5, 0], [10, -6], [20, -12], [40, -18]]) {
    assert.equal(rangePenalty(weapon, distance), expected);
  }
  assert.equal(rangePenalty({ rangeModifier: 2 }, 10), -4);
  assert.equal(rangePenalty({ rangeModifier: 20 }, 10), 0);
  assert.equal(rangePenalty({ rangeModifier: 0 }, 4), 0);
});

test("a missing equipped weapon item falls back to unarmed", () => {
  const weapon = weaponForActor({
    system: { weapon: { selected: "Heavy Gun" } },
    items: new Map()
  });

  assert.deepEqual(weapon, {
    name: "Unarmed",
    skill: "Waffenlos",
    weight: null,
    hand: 2,
    bep: 2,
    rangeModifier: 0,
    clip: null,
    ammo: null,
    nozzle: null
  });
});

test("distance includes elevation without rounding and attacks apply the full modifier", () => {
  const scene = { grid: { size: 100, distance: 1 } };
  const source = { center: { x: 0, y: 0 }, document: { elevation: 0 } };
  const target = { center: { x: 300, y: 0 }, document: { elevation: 4 } };
  assert.equal(tokenDistance(source, target, scene), 5);
  target.document.elevation = 0;
  target.center.y = 100;
  const distance = tokenDistance(source, target, scene);
  assert.equal(distance, Math.sqrt(10));
  const weapon = { type: "weapon", name: "Test", system: { rangeModifier: 0, skill: "Test", bep: 1 } };
  const attacker = { system: { weapon: { selected: "w" }, skills: { Test: { value: 20 } }, health: {} }, items: new Map([["w", weapon]]) };
  const originalRandom = Math.random;
  try {
    Math.random = () => 0; // Both n5 rolls terminate at zero.
    const outcome = resolveAttack({ attacker, target: { system: { health: {}, armor: {} } }, skillKey: "Test", distance });
    assert.equal(outcome.result, 20 + rangePenalty({ rangeModifier: 0 }, distance));
    assert.equal(outcome.distPen, 0);
    assert.equal(formatAttackResult(outcome), outcome.result.toFixed(1));
  } finally {
    Math.random = originalRandom;
  }
});

test("weapons without a clip use melee at displayed 1.0 m", () => {
  const originalRandom = Math.random;
  try {
    Math.random = () => 0;
    for (const weapon of [
      { type: "weapon", name: "Short Weapon", system: { skill: "Kurzwaffen", bep: 5, clip: null, rangeModifier: 0 } },
      { type: "weapon", name: "Long Weapon", system: { skill: "Langwaffen", bep: 7, clip: null, rangeModifier: 0 } }
    ]) {
      const attacker = { system: { weapon: { selected: "weapon" }, skills: { [weapon.system.skill]: { value: 13 } }, health: {} }, items: new Map([["weapon", weapon]]) };
      const target = { system: { health: {}, armor: {} } };
      const melee = resolveAttack({ attacker, target, skillKey: weapon.system.skill, distance: 1.04 });
      const thrown = resolveAttack({ attacker, target, skillKey: weapon.system.skill, distance: 1.06 });
      assert.equal(isMeleeAttack(weapon.system, 1), true);
      assert.equal(isMeleeAttack(weapon.system, 1.04), true);
      assert.equal(isMeleeAttack(weapon.system, 1.06), false);
      assert.equal(melee.distPen, 0);
      assert.equal(melee.result, 13);
      assert.equal(melee.damage, 3 + weapon.system.bep);
      assert.equal(thrown.distPen, 0);
      assert.equal(thrown.result, 13);
      assert.equal(thrown.damage, 3 + weapon.system.bep);
    }
    assert.equal(isMeleeAttack({ skill: "Geschosswaffen", clip: null }, 1), true);
    assert.equal(isMeleeAttack({ skill: "Kurzwaffen", clip: 1 }, 1), false);
    assert.equal(rangePenalty({ skill: "Geschosswaffen", rangeModifier: 0 }, 10), -6);
  } finally {
    Math.random = originalRandom;
  }
});

test("primarily ranged weapons add ten to the attack", () => {
  assert.equal(primarilyRangedBonus({ nozzle: "10m/s" }), 0);
  assert.equal(primarilyRangedBonus({ nozzle: "11m/s" }), 10);
  assert.equal(primarilyRangedBonus({ nozzle: "Light" }), 10);

  const weapon = { type: "weapon", name: "Test", system: { clip: 1, nozzle: "Light", rangeModifier: 0, skill: "Test", bep: 1 } };
  const attacker = { system: { weapon: { selected: "w" }, skills: { Test: { value: 20 } }, health: {} }, items: new Map([["w", weapon]]) };
  const originalRandom = Math.random;
  try {
    Math.random = () => 0;
    const outcome = resolveAttack({ attacker, target: { system: { health: {}, armor: {} } }, skillKey: "Test", distance: 5 });
    assert.equal(outcome.primarilyRangedBonus, 10);
    assert.equal(outcome.result, 30);
    assert.match(buildAttackCard(outcome).attackFormula, /\+ 10 \(ranged\)/);
  } finally {
    Math.random = originalRandom;
  }
});

test("target badges redraw on movement, elevation, selection, and weapon changes", async () => {
  const hooks = new Map();
  globalThis.Hooks = { on(name, fn) { hooks.set(name, fn); } };
  let pending;
  globalThis.requestAnimationFrame = (fn) => { pending = fn; return 1; };
  globalThis.cancelAnimationFrame = () => { pending = null; };
  const flush = () => { const fn = pending; pending = null; fn?.(); };
  class Container {
    constructor() { this.children = []; this.position = { set() {} }; this.scale = { set() {} }; }
    addChild(...children) { this.children.push(...children); }
    removeChildren() { return this.children.splice(0); }
    destroy() { this.removeChildren(); }
  }
  class Graphics extends Container {
    beginFill() {} lineStyle() {} drawRoundedRect() {} endFill() {}
  }
  class Text extends Container {
    constructor(text) { super(); this.text = text; this.width = 80; this.height = 15; }
    static getTextStyle(style) { return style; }
  }
  globalThis.PIXI = { Container, Graphics };
  globalThis.foundry = { canvas: { containers: { PreciseText: Text } } };
  const weapon = { type: "weapon", name: "Test", system: { rangeModifier: 0, skill: "Test" } };
  const actor = { type: "character", system: { weapon: { selected: "w" } }, items: new Map([["w", weapon]]) };
  const source = { actor, center: { x: 0, y: 0 }, document: { elevation: 0 } };
  const target = { actor: { type: "character" }, visible: true, center: { x: 300, y: 0 }, h: 100, document: { elevation: 4 } };
  const scene = { grid: { size: 100, distance: 1 } };
  const parent = new Container();
  globalThis.canvas = { ready: true, scene, tokens: { controlled: [source] }, stage: { scale: { x: 1 } }, interface: parent };
  globalThis.game = { user: { targets: new Set([target]) } };
  await import("../module/canvas/target-distance.mjs");
  hooks.get("canvasReady")(); flush();
  const label = () => parent.children[0].children[0]?.children[1]?.text;
  assert.equal(label(), `5.0 m · ${rangePenalty({ rangeModifier: 0 }, 5).toFixed(1)}`);
  source.center.x = 100;
  hooks.get("refreshToken")(source); flush();
  assert.equal(label(), `${Math.sqrt(20).toFixed(1)} m · ${rangePenalty({ rangeModifier: 0 }, Math.sqrt(20)).toFixed(1)}`);
  target.center.x = 500;
  hooks.get("updateToken")(target.document); flush();
  assert.equal(label(), `${Math.sqrt(32).toFixed(1)} m · ${rangePenalty({ rangeModifier: 0 }, Math.sqrt(32)).toFixed(1)}`);
  target.document.elevation = 0;
  hooks.get("updateToken")(target.document); flush();
  assert.equal(label(), `4.0 m · ${rangePenalty({ rangeModifier: 0 }, 4).toFixed(1)}`);
  weapon.system.rangeModifier = -2;
  hooks.get("updateItem")(weapon); flush();
  assert.equal(label(), `4.0 m · ${rangePenalty({ rangeModifier: -2 }, 4).toFixed(1)}`);
  weapon.system.skill = "Kurzwaffen";
  target.center.x = 200;
  hooks.get("updateItem")(weapon); flush();
  assert.equal(label(), "1.0 m · Melee");
  target.center.x = 201;
  hooks.get("refreshToken")(target); flush();
  assert.equal(label(), "1.0 m · Melee");
  target.center.x = 206;
  hooks.get("refreshToken")(target); flush();
  assert.equal(label(), `1.1 m · ${rangePenalty({ skill: "Kurzwaffen", rangeModifier: -2 }, 1.06).toFixed(1)}`);
  actor.system.weapon.selected = "Unarmed";
  target.center.x = 200;
  hooks.get("updateActor")(actor); flush();
  assert.equal(label(), "1.0 m · Melee");
  target.center.x = 201;
  hooks.get("refreshToken")(target); flush();
  assert.equal(label(), "1.0 m · Melee");
  target.center.x = 206;
  hooks.get("refreshToken")(target); flush();
  assert.equal(label(), "1.1 m · −∞");
  game.user.targets.clear();
  hooks.get("targetToken")(); flush();
  assert.equal(label(), undefined);
  hooks.get("canvasTearDown")();
});
