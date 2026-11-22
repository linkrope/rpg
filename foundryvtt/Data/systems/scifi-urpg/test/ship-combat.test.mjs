import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DILITHIUM_KWS_PER_TONNE,
  applyShipAcceleration,
  convertDilithium,
  generateReactorEnergy,
  rechargeShields,
  resolveShipAttack,
  shipFiringDamageMultiplier,
  shipFiringDimension,
  shipFiringProfile,
  shipFiringSeconds,
  shipDamagePenalty,
  shipWeaponShotOutput,
  shipWeaponOutput,
  shipRangePenalty,
} from "../module/rules/ship-combat.mjs";

const gunner = (value) => ({ system: { skills: { Eingebettete: { value } } } });
const crewActor = ({ gunnery = 0, piloting = 0, damage = 0 } = {}) => ({
  system: {
    skills: { Eingebettete: { value: gunnery }, Raumfahrzeuge: { value: piloting } },
    health: { damage },
  },
});
const ship = (system) => ({ type: "ship", system });

test("ship range uses five kilometres as the neutral distance", () => {
  assert.equal(shipRangePenalty({}, 5_000), 0);
  assert.equal(shipRangePenalty({}, 10_000), -6);
  assert.equal(shipRangePenalty({}, 1_000), 0);
  assert.equal(shipRangePenalty({ rangeModifier: 3 }, 10_000), -3);
});

test("ship structural damage penalty is the lost percentage of ship mass", () => {
  assert.equal(shipDamagePenalty(ship({ design: { tonnageOverride: 100 }, damage: 20 })), 20);
  assert.equal(shipDamagePenalty(ship({ design: { tonnageOverride: 200 }, damage: 20 })), 10);
  assert.equal(shipDamagePenalty(ship({ design: { tonnageOverride: 60 }, damage: 8.6 })), 14);
  assert.equal(shipDamagePenalty(ship({ design: { tonnageOverride: 0 }, damage: 20 })), 0);
});

test("ship weapon output is derived from gun mass and shared among weapon entries", () => {
  const vessel = {
    ...ship({ design: { gunMassOverride: 2.5 } }),
    items: [
      { type: "shipWeapon", system: { bep: 999_999, energy: 999_999 } },
      { type: "shipWeapon", system: { bep: 999_999, energy: 999_999 } },
    ],
  };

  // 2.5 t yields 10 kBEP/s and 10 MWs in total; neither item supplies stats.
  assert.deepEqual(shipWeaponOutput(vessel), { damage: 5_000, energy: 5_000 });
});

test("a firing profile factors derived ship weapon damage and energy without changing the weapon", () => {
  const vessel = ship({ design: { gunMassOverride: 2.5 } });

  assert.deepEqual(shipWeaponShotOutput(vessel, { damageFactor: 0.5, energyFactor: 3 }), {
    damage: 5_000,
    energy: 30_000,
  });
  assert.deepEqual(shipWeaponShotOutput(vessel, { damageFactor: -1, energyFactor: "" }), {
    damage: 0,
    energy: 10_000,
  });
});

test("firing controls use five-dimension steps for seconds, damage, and integer MWs", () => {
  const vessel = ship({ design: { gunMassOverride: 2.5 } });

  assert.equal(shipFiringDimension(7), 5);
  assert.equal(shipFiringDimension(-53), -50);
  assert.equal(shipFiringSeconds(15), 8);
  assert.ok(Math.abs(shipFiringDamageMultiplier(15) - 4.096) < 1e-12);
  assert.deepEqual(shipFiringProfile(vessel, { timeDimension: 5, energyMws: null }), {
    timeDimension: 5,
    seconds: 2,
    maximumEnergyMws: 20,
    energyMws: 20,
    damageFactor: 1.6,
    energyFactor: 2,
  });
  assert.deepEqual(shipFiringProfile(vessel, { timeDimension: -5, energyMws: 2 }), {
    timeDimension: -5,
    seconds: 0.5,
    maximumEnergyMws: 5,
    energyMws: 2,
    damageFactor: 0.25,
    energyFactor: 0.2,
  });
  assert.equal(shipFiringProfile(vessel, { timeDimension: 5, energyMws: 0 }).damageFactor, 0);
});

test("ship attacks use firing-profile factors for damage and battery cost", () => {
  const attacker = ship({ energy: { value: 100 }, design: { gunMassOverride: 0.00625 } });
  const target = ship({ shields: { value: 0 } });
  const outcome = resolveShipAttack({
    attacker,
    target,
    weapon: { system: { rangeModifier: 0 } },
    gunners: [gunner(1)],
    distance: 1_000,
    firingProfile: { damageFactor: 2, energyFactor: 3 },
    roll: { plus: 0, minus: 0, total: 0 },
  });

  assert.equal(outcome.rawDamage, 50);
  assert.equal(outcome.energyCost, 75);
  assert.deepEqual(outcome.attackerUpdateData, { "system.energy.value": 25 });
});

test("ship attacks apply the firing-time bonus independently of an attack modifier", () => {
  const outcome = resolveShipAttack({
    attacker: ship({ energy: { value: 100 }, design: { gunMassOverride: 0.00625 } }),
    target: ship({ shields: { value: 0 } }),
    weapon: { system: { rangeModifier: 0 } },
    gunners: [gunner(1)],
    bonus: 2,
    timeBonus: 5,
    distance: 1_000,
    roll: { plus: 0, minus: 0, total: 0 },
  });

  assert.equal(outcome.bonus, 2);
  assert.equal(outcome.timeBonus, 5);
  assert.equal(outcome.result, 8);
});

test("ship attacks combine gunners, drain shields, then apply fixed hull armour", () => {
  const target = ship({ design: { baseMark: "II" }, damage: 1, shields: { value: 2_000 } });
  const outcome = resolveShipAttack({
    attacker: ship({ design: { gunMassOverride: 1 } }), target,
    weapon: { system: { bep: 4_000, accuracy: 0, rangeModifier: 0 } },
    gunners: [gunner(10), gunner(10)],
    distance: 1_000,
    roll: { plus: 0, minus: 0, total: 0 },
  });

  // Two equal skills use the system's five-step addition rule: 10 ⊕ 10 = 15.
  assert.equal(outcome.gunnery, 15);
  assert.equal(outcome.rawDamage, 4_000);
  assert.equal(outcome.shieldDamage, 2_000);
  assert.equal(outcome.hullArmor, 240);
  assert.equal(outcome.hullArmorDamage, 240);
  assert.equal(outcome.hullDamage, 1_760);
  assert.equal(outcome.shipDamage, 1.76);
  assert.deepEqual(outcome.updateData, { "system.shields.value": 0, "system.damage": 2.76 });
});

test("one kBEP that bypasses shields loses 0.760 t after 240 BEP hull armour", () => {
  const target = ship({ design: { baseMark: "II" }, damage: 0, shields: { value: 0 } });
  const outcome = resolveShipAttack({
    attacker: ship({ design: { gunMassOverride: 0.25 } }), target,
    weapon: { system: { bep: 1_000, rangeModifier: 0 } },
    gunners: [gunner(1)],
    distance: 1_000,
    roll: { plus: 0, minus: 0, total: 0 },
  });

  assert.equal(outcome.rawDamage, 1_000);
  assert.equal(outcome.shieldDamage, 0);
  assert.equal(outcome.hullArmorDamage, 240);
  assert.equal(outcome.hullDamage, 760);
  assert.equal(outcome.shipDamage, 0.76);
  assert.deepEqual(outcome.updateData, { "system.shields.value": 0, "system.damage": 0.76 });
});

test("repeated generic crew members combine their gunnery contributions", () => {
  const target = ship({ hull: { value: 20 }, shields: { value: 0 } });
  const pirate = gunner(0);
  const outcome = resolveShipAttack({
    attacker: ship({ design: { gunMassOverride: 0.00075 } }), target,
    weapon: { system: { bep: 1, accuracy: 0, rangeModifier: 0 } },
    gunners: [pirate, pirate, pirate, pirate],
    distance: 1_000,
    roll: { plus: 0, minus: 0, total: 0 },
  });

  assert.equal(outcome.gunnery, 10);
  assert.equal(outcome.result, 10);
  assert.equal(outcome.hit, true);
});

test("crew rows apply injury and multitasking before combining role skills", () => {
  const target = ship({ hull: { value: 20 }, shields: { value: 0 } });
  const sharedNpc = crewActor({ gunnery: 12, piloting: 10, damage: 2 });
  const outcome = resolveShipAttack({
    attacker: ship({ design: { gunMassOverride: 0.00075 } }), target,
    weapon: { system: { bep: 3, accuracy: 0, rangeModifier: 0 } },
    // These are two physical crew members sharing a single NPC Actor.
    crewMembers: [
      { actor: sharedNpc, pilot: true, gunner: true },
      { actor: sharedNpc, pilot: true, gunner: true },
    ],
    targetCrewMembers: [{ actor: crewActor({ piloting: 10, damage: 2 }), pilot: true, gunner: false }],
    distance: 1_000,
    roll: { plus: 0, minus: 0, total: 0 },
  });

  // (12 − 5 multitasking − 2 damage) ⊕ itself = 5 ⊕ 5 = 10.
  assert.equal(outcome.gunnery, 10);
  // The defending pilot is not multitasking: 10 − 2 damage = 8.
  assert.equal(outcome.evasion, 8);
  assert.equal(outcome.result, 2);
  assert.equal(outcome.hit, true);
  assert.equal(outcome.rawDamage, 3);
});

test("ship damage reduces gunnery and evasion after crew skills are combined", () => {
  const attacker = ship({ damage: 1.5, design: { tonnageOverride: 100, gunMassOverride: 0.00075 } });
  const target = ship({ damage: 2.25, design: { tonnageOverride: 100 }, shields: { value: 0 } });
  const outcome = resolveShipAttack({
    attacker, target,
    weapon: { system: { bep: 3, rangeModifier: 0 } },
    crewMembers: [{ actor: crewActor({ gunnery: 10 }), gunner: true }],
    targetCrewMembers: [{ actor: crewActor({ piloting: 8 }), pilot: true }],
    distance: 1_000,
    roll: { plus: 0, minus: 0, total: 0 },
  });

  assert.equal(outcome.gunneryBeforeDamage, 10);
  assert.equal(outcome.attackerDamage, 2);
  assert.equal(outcome.gunnery, 8);
  assert.equal(outcome.evasionBeforeDamage, 8);
  assert.equal(outcome.defenderDamage, 2);
  assert.equal(outcome.evasion, 6);
  assert.equal(outcome.result, 2);
});

test("a ship with no assigned pilot has zero evasion", () => {
  const target = ship({ hull: { value: 20 }, shields: { value: 0 } });
  const outcome = resolveShipAttack({
    attacker: ship({}), target,
    weapon: { system: { bep: 1, accuracy: 0, rangeModifier: 0 } },
    crewMembers: [{ actor: crewActor({ gunnery: 4 }), gunner: true }],
    targetCrewMembers: [],
    distance: 1_000,
    roll: { plus: 0, minus: 0, total: 0 },
  });

  assert.equal(outcome.evasion, 0);
  assert.equal(outcome.result, 4);
  assert.equal(outcome.hit, true);
});

test("ship weapons spend energy for every shot and no longer add Accuracy", () => {
  const attacker = ship({ energy: { value: 100 }, design: { gunMassOverride: 0.00625 } });
  const target = ship({ hull: { value: 20 }, shields: { value: 0 } });
  const outcome = resolveShipAttack({
    attacker,
    target,
    // Accuracy is deliberately ignored after the field was replaced by Energy.
    weapon: { system: { bep: 1, accuracy: 100, energy: 25, rangeModifier: 0 } },
    gunners: [gunner(0)],
    distance: 1_000,
    roll: { plus: 0, minus: 0, total: 0 },
  });

  assert.equal(outcome.result, 0);
  assert.equal(outcome.hit, false);
  assert.equal(outcome.energyCost, 25);
  assert.deepEqual(outcome.attackerUpdateData, { "system.energy.value": 75 });
});

test("recharging shields costs 10 MWs per kBEP", () => {
  const result = rechargeShields(ship({
    design: { shieldMassOverride: 1 },
    shields: { value: 3_000 }, energy: { value: 10_000 },
  }));
  assert.equal(result.transfer, 1_000);
  assert.deepEqual(result.updateData, { "system.shields.value": 4_000, "system.energy.value": 0 });
});

test("coasting is free while acceleration and braking consume energy", () => {
  const vessel = ship({ mass: 4, energy: { value: 20 }, movement: { velocityX: 3, velocityY: 0 } });
  const coast = applyShipAcceleration(vessel, { x: 0, y: 0 });
  assert.equal(coast.cost, 0);
  assert.equal(coast.updateData["system.energy.value"], 20);

  const brake = applyShipAcceleration(vessel, { x: -2, y: 1 });
  assert.equal(brake.cost, 12);
  assert.equal(brake.velocityX, 1);
  assert.equal(brake.velocityY, 1);
  assert.equal(brake.updateData["system.energy.value"], 8);
});

test("Dilithium converts to the specified 100 GWh energy budget", () => {
  const vessel = ship({
    design: { batteryMassOverride: DILITHIUM_KWS_PER_TONNE / 1_000 },
    dilithium: 1, energy: { value: 0 },
  });
  const result = convertDilithium(vessel, 1);
  assert.equal(result.tonnes, 1);
  assert.equal(result.energy, DILITHIUM_KWS_PER_TONNE);
  assert.equal(result.updateData["system.dilithium"], 0);
});

test("a reactor adds its calculated total kW output as kWs for one second", () => {
  const result = generateReactorEnergy(ship({
    design: { generatorMassOverride: 1 },
    mass: 4, energy: { value: 10_000 },
  }));
  assert.equal(result.generated, 1_000);
  assert.deepEqual(result.updateData, { "system.energy.value": 11_000 });
});

test("a reactor uses fractional seconds selected by the firing-time slider", () => {
  const result = generateReactorEnergy(ship({
    design: { generatorMassOverride: 1 },
    energy: { value: 10_000 },
  }), 0.5);

  assert.equal(result.seconds, 0.5);
  assert.equal(result.generated, 500);
  assert.deepEqual(result.updateData, { "system.energy.value": 10_500 });
});
