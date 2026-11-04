import { test } from "node:test";
import assert from "node:assert/strict";
import { migrateShipSystemUnits, migrateShipWeaponSystemUnits } from "../module/rules/ship-units.mjs";

async function ShipDataModel() {
  globalThis.foundry = {
    abstract: { TypeDataModel: class { static migrateData(source) { return source; } } },
    data: { fields: {} },
  };
  return (await import(`../module/data/ship-data.mjs?test=${Date.now()}-${Math.random()}`)).ShipDataModel;
}

test("ship migration creates a standard design from an older ship's saved Mk", async () => {
  const Model = await ShipDataModel();
  const source = {
    mark: "II",
    mass: 15,
    hull: { value: 200, max: 240 },
    shields: { value: 150, max: 200 },
    energy: { value: 400, max: 4_000 },
    crew: { members: [{ actorId: "pilot", pilot: true, gunner: false }] },
  };

  Model.migrateData(source);

  assert.deepEqual(source.design, {
    mode: "standard", baseMark: "II", length: 60,
    tonnageOverride: null, hullThicknessOverride: null,
    batteryMassOverride: null, generatorMassOverride: null,
    shieldMassOverride: null, gunMassOverride: null,
  });
  assert.equal(source.hull.value, 200);
  assert.deepEqual(source.crew.members, [{ actorId: "pilot", pilot: true, gunner: false }]);
});

test("ship migration leaves an existing custom design untouched", async () => {
  const Model = await ShipDataModel();
  const design = {
    mode: "custom", baseMark: "II", length: 75, tonnageOverride: 30,
    hullThicknessOverride: 25, batteryMassOverride: 4,
    generatorMassOverride: null, shieldMassOverride: null, gunMassOverride: null,
  };
  const source = {
    mark: "I",
    design,
  };

  Model.migrateData(source);

  assert.strictEqual(source.design, design);
  assert.equal(source.mark, "I");
});

test("ship migration does not create a Mk-I design from an operational partial update", async () => {
  const Model = await ShipDataModel();
  const source = { energy: { value: 300 } };

  Model.migrateData(source);

  assert.equal(source.design, undefined);
});

test("legacy ship resources migrate once from display units to integer base units", () => {
  const source = {
    hull: { value: 240, max: 240 },
    shields: { value: 375, max: 500 },
    energy: { value: 3_750, max: 5_000 },
  };

  assert.deepEqual(migrateShipSystemUnits(source), {
    "flags.scifi-urpg.shipUnitsVersion": 2,
    "system.shields.value": 375_000,
    "system.shields.max": 500_000,
    "system.energy.value": 3_750_000,
    "system.energy.max": 5_000_000,
  });
  assert.equal(source.hull.value, 240);
  assert.equal(migrateShipSystemUnits(source, 2), null);
});

test("legacy ship weapons migrate once from kBEP and MWs", () => {
  const source = { bep: 7.5, energy: 0.75 };
  assert.deepEqual(migrateShipWeaponSystemUnits(source), {
    "flags.scifi-urpg.shipUnitsVersion": 2,
    "system.bep": 7_500,
    "system.energy": 750,
  });
  assert.equal(migrateShipWeaponSystemUnits(source, 2), null);
});

test("derived capacities do not discard valid current Hull or Shields before they are calculated", async () => {
  const Model = await ShipDataModel();
  const ship = {
    design: { mode: "standard", baseMark: "I", length: 40 },
    // These are stale source maxima from before calculated design capacities.
    hull: { value: 100, max: 20 },
    shields: { value: 40_000, max: 10_000 },
    energy: { value: 300_000, max: 4_000_000 },
    reactor: { output: 0 },
    mass: 0,
  };

  Model.prototype.prepareBaseData.call(ship);
  Model.prototype.prepareDerivedData.call(ship);

  assert.equal(ship.hull.value, 100);
  assert.equal(ship.shields.value, 40_000);
  assert.equal(ship.energy.value, 300_000);
});
