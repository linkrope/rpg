import { test } from "node:test";
import assert from "node:assert/strict";

test("ship design display rounds floating-point free tonnage to three decimals", async () => {
  globalThis.ActorSheet = class { async getData() { return {}; } };
  globalThis.game = { actors: new Map() };
  const { SciFiShipSheet } = await import(`../module/sheets/ship-sheet.mjs?test=${Date.now()}`);
  const sheet = Object.create(SciFiShipSheet.prototype);
  sheet.actor = {
    system: {
      design: { mode: "standard", baseMark: "I", length: 40, tonnageOverride: null },
      crew: { members: [] }, weapon: {}, movement: { velocityX: 0, velocityY: 0 },
    },
    items: [],
  };

  const context = await sheet.getData();

  assert.equal(context.specificationDisplay.freeTonnage, "0.512");
  assert.equal(context.damageInput, "");
  assert.equal(context.damagePenaltyDisplay, "0");
  assert.equal(context.hasDamagePenalty, false);
});

test("ship damage input rounds to one fractional digit", async () => {
  globalThis.ActorSheet = class { async getData() { return {}; } };
  globalThis.game = { actors: new Map() };
  const { SciFiShipSheet } = await import(`../module/sheets/ship-sheet.mjs?damage-display-test=${Date.now()}`);
  const sheet = Object.create(SciFiShipSheet.prototype);
  sheet.actor = {
    system: {
      damage: 1.25,
      design: { mode: "standard", baseMark: "I", length: 40, tonnageOverride: null },
      crew: { members: [] }, weapon: {}, movement: { velocityX: 0, velocityY: 0 },
    },
    items: [],
  };

  const context = await sheet.getData();

  assert.equal(context.damageInput, "1.3");
  assert.equal(context.damagePenaltyDisplay, "31");
  assert.equal(context.hasDamagePenalty, true);
});

test("ship firing time displays powers below one second as fractions", async () => {
  globalThis.ActorSheet = class { async getData() { return {}; } };
  globalThis.game = { actors: new Map() };
  const { SciFiShipSheet } = await import(`../module/sheets/ship-sheet.mjs?firing-time-display-test=${Date.now()}`);
  const sheet = Object.create(SciFiShipSheet.prototype);
  sheet.actor = {
    system: {
      firing: { timeDimension: -5, energyMws: null },
      design: { mode: "standard", baseMark: "I", length: 40, tonnageOverride: null },
      crew: { members: [] }, weapon: {}, movement: { velocityX: 0, velocityY: 0 },
    },
    items: [],
  };

  const context = await sheet.getData();

  assert.equal(context.attack.seconds, "1/2");
  assert.equal(context.attack.timeBonus, "-5");
});

test("ship firing controls display the selected shot damage", async () => {
  globalThis.ActorSheet = class { async getData() { return {}; } };
  globalThis.game = { actors: new Map() };
  const { SciFiShipSheet } = await import(`../module/sheets/ship-sheet.mjs?firing-damage-display-test=${Date.now()}`);
  const sheet = Object.create(SciFiShipSheet.prototype);
  sheet.actor = {
    system: {
      firing: { timeDimension: 5, energyMws: 2 },
      design: { gunMassOverride: 0.25 },
      crew: { members: [] }, weapon: {}, movement: { velocityX: 0, velocityY: 0 },
    },
    items: [{ id: "weapon-1", type: "shipWeapon", name: "Railgun", system: { rangeModifier: 0 } }],
  };

  const context = await sheet.getData();

  assert.equal(context.attack.damage, "1.6");
});

test("clearing ship damage resets it to zero", async () => {
  globalThis.ActorSheet = class {};
  globalThis.foundry = { utils: { deepClone: (value) => ({ ...value }) } };
  const { SciFiShipSheet } = await import(`../module/sheets/ship-sheet.mjs?test=${Date.now()}`);
  let updateData;
  const sheet = Object.create(SciFiShipSheet.prototype);
  sheet.actor = { update: async (data) => { updateData = data; } };

  await sheet._updateObject({}, { "system.damage": "-" });

  assert.deepEqual(updateData, { "system.damage": 0 });
});
