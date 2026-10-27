import { test } from "node:test";
import assert from "node:assert/strict";

class Items extends Map {
  filter(predicate) {
    return Array.from(this.values()).filter(predicate);
  }
}

async function createSheet(actor) {
  globalThis.ActorSheet = class {
    constructor(sheetActor) { this.actor = sheetActor; }
  };
  globalThis.Application = class {};
  globalThis.foundry = { utils: { escapeHTML: (value) => String(value) } };
  const { SciFiCharacterSheet } = await import(`../module/sheets/character-sheet.mjs?weapons=${Date.now()}-${Math.random()}`);
  return new SciFiCharacterSheet(actor);
}

test("clicking a weapon row equips that weapon", async () => {
  const updates = [];
  const actor = {
    system: { weapon: { selected: "Unarmed" }, skills: {}, health: {} },
    items: new Items([["laser", { id: "laser", type: "weapon", name: "Laser", system: {} }]]),
    update: async (change) => { updates.push(change); }
  };
  const sheet = await createSheet(actor);

  await sheet._onEquipWeapon({
    preventDefault() {},
    currentTarget: { dataset: { weaponId: "laser" } }
  });

  assert.deepEqual(updates, [{ "system.weapon.selected": "laser" }]);
});

test("aim state exposes a penalty only when aiming narrows the target", async () => {
  const actor = {
    system: { weapon: { selected: "Unarmed" }, skills: { Waffenlos: { value: 12 } }, health: {} },
    items: new Items(),
    update: async () => {}
  };
  const sheet = await createSheet(actor);

  assert.equal(sheet._buildAttackContext(actor.system).hasAimPenalty, false);
  sheet._attackAimZones = new Set(["head"]);
  const aimed = sheet._buildAttackContext(actor.system);
  assert.equal(aimed.hasAimPenalty, true);
  assert.equal(aimed.aimPen, 17);
});
