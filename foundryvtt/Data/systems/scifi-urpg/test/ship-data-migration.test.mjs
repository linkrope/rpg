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
  assert.deepEqual(source.firing, { timeDimension: 0, energyMws: null });
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
  assert.deepEqual(source.firing, { timeDimension: 0, energyMws: null });
  assert.equal(source.mark, "I");
});

test("ship migration does not create a Mk-I design from an operational partial update", async () => {
  const Model = await ShipDataModel();
  const source = { energy: { value: 300 } };

  Model.migrateData(source);

  assert.equal(source.design, undefined);
  assert.equal(source.firing, undefined);
});

test("legacy ship resources retain charge and remove the obsolete hull resource", () => {
  const source = {
    hull: { value: 240, max: 240 },
    shields: { value: 375, max: 500 },
    energy: { value: 3_750, max: 5_000 },
  };

  assert.deepEqual(migrateShipSystemUnits(source), {
    "flags.scifi-urpg.shipUnitsVersion": 5,
    "system.shields.value": 37_500,
    "system.energy.value": 3_750_000,
    "system.firing.timeDimension": 0,
    "system.firing.energyMws": null,
    "system.-=hull": null,
    "system.shields.-=max": null,
    "system.energy.-=max": null,
    "system.-=reactor": null,
  });
  assert.equal(source.hull.value, 240);
  assert.deepEqual(migrateShipSystemUnits({ shields: { value: 40_000, max: 100_000 } }, 2), {
    "flags.scifi-urpg.shipUnitsVersion": 5,
    "system.shields.value": 4_000,
    "system.firing.timeDimension": 0,
    "system.firing.energyMws": null,
    "system.-=hull": null,
    "system.shields.-=max": null,
    "system.energy.-=max": null,
    "system.-=reactor": null,
  });
  assert.equal(migrateShipSystemUnits(source, 5), null);
});

test("legacy ship weapons drop persisted output in favour of ship-derived values", () => {
  const source = { bep: 7.5, energy: 0.75 };
  assert.deepEqual(migrateShipWeaponSystemUnits(source), {
    "flags.scifi-urpg.shipUnitsVersion": 5,
    "system.-=bep": null,
    "system.-=energy": null,
  });
  assert.deepEqual(migrateShipWeaponSystemUnits({ bep: 7_500, energy: 750 }, 2), {
    "flags.scifi-urpg.shipUnitsVersion": 5,
    "system.-=bep": null,
    "system.-=energy": null,
  });
  assert.equal(migrateShipWeaponSystemUnits(source, 5), null);
});

test("ship firing-control migration preserves existing slider selections", () => {
  assert.deepEqual(migrateShipSystemUnits({
    firing: { timeDimension: 15, energyMws: 42.8 },
  }, 4), {
    "flags.scifi-urpg.shipUnitsVersion": 5,
    "system.firing.timeDimension": 15,
    "system.firing.energyMws": 42,
    "system.-=hull": null,
    "system.shields.-=max": null,
    "system.energy.-=max": null,
    "system.-=reactor": null,
  });
});

test("derived capacities do not discard valid current Shields before they are calculated", async () => {
  const Model = await ShipDataModel();
  const ship = {
    design: { mode: "standard", baseMark: "I", length: 40 },
    // These are stale source maxima from before calculated design capacities.
    shields: { value: 4_000, max: 10_000 },
    energy: { value: 300_000, max: 4_000_000 },
    damage: 0.76,
    damageBar: { value: 0, max: 0 },
    reactor: { output: 0 },
    mass: 0,
  };

  Model.prototype.prepareBaseData.call(ship);
  Model.prototype.prepareDerivedData.call(ship);

  assert.equal(ship.damage, 0.76);
  assert.deepEqual(ship.damageBar, { value: 0.76, max: ship.mass });
  assert.equal(ship.shields.value, 4_000);
  assert.equal(ship.energy.value, 300_000);
});
