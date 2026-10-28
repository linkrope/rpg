import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DILITHIUM_KWS_PER_TONNE,
  applyShipAcceleration,
  convertDilithium,
  generateReactorEnergy,
  rechargeShields,
  resolveShipAttack,
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

test("ship range uses one kilometre as the neutral distance", () => {
  assert.equal(shipRangePenalty({}, 1_000), 0);
  assert.equal(shipRangePenalty({}, 2_000), -6);
  assert.equal(shipRangePenalty({}, 500), 0);
  assert.equal(shipRangePenalty({ rangeModifier: 3 }, 2_000), -3);
});

test("ship attacks combine gunners, drain shields, then damage hull", () => {
  const target = ship({ hull: { value: 20 }, shields: { value: 5 } });
  const outcome = resolveShipAttack({
    attacker: ship({}), target,
    weapon: { system: { bep: 4, accuracy: 0, rangeModifier: 0 } },
    gunners: [gunner(10), gunner(10)],
    distance: 1_000,
    roll: { plus: 0, minus: 0, total: 0 },
  });

  // Two equal skills use the system's five-step addition rule: 10 ⊕ 10 = 15.
  assert.equal(outcome.gunnery, 15);
  assert.equal(outcome.rawDamage, 7);
  assert.equal(outcome.shieldDamage, 5);
  assert.equal(outcome.hullDamage, 2);
  assert.deepEqual(outcome.updateData, { "system.shields.value": 0, "system.hull.value": 18 });
});

test("repeated generic crew members combine their gunnery contributions", () => {
  const target = ship({ hull: { value: 20 }, shields: { value: 0 } });
  const pirate = gunner(0);
  const outcome = resolveShipAttack({
    attacker: ship({}), target,
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
    attacker: ship({}), target,
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

test("recharging shields moves battery charge without repairing a shield component", () => {
  const result = rechargeShields(ship({ shields: { value: 3, max: 10 }, energy: { value: 4 } }));
  assert.equal(result.transfer, 4);
  assert.deepEqual(result.updateData, { "system.shields.value": 7, "system.energy.value": 0 });
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
  const vessel = ship({ dilithium: 1, energy: { value: 0, max: DILITHIUM_KWS_PER_TONNE } });
  const result = convertDilithium(vessel, 1);
  assert.equal(result.tonnes, 1);
  assert.equal(result.energy, DILITHIUM_KWS_PER_TONNE);
  assert.equal(result.updateData["system.dilithium"], 0);
});

test("a reactor creates its kW output times mass once per round", () => {
  const result = generateReactorEnergy(ship({ mass: 4, reactor: { output: 100 }, energy: { value: 10, max: 1_000 } }));
  assert.equal(result.generated, 400);
  assert.deepEqual(result.updateData, { "system.energy.value": 410 });
});
