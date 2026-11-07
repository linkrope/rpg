import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateShipSpecification,
  niceRoundedTonnage,
  standardShipDesign,
} from "../module/rules/ship-design.mjs";

test("the tonnage formula recreates every standard design", () => {
  assert.deepEqual(
    [40, 60, 100, 150, 400].map(niceRoundedTonnage),
    [4, 15, 65, 230, 4300],
  );
});

test("a 75 metre Type II custom design recalculates from its length", () => {
  const design = { ...standardShipDesign("II"), mode: "custom", length: 75 };
  const specification = calculateShipSpecification(design);

  assert.equal(specification.tonnage, 30);
  assert.equal(specification.surface, 33_750);
  assert.equal(specification.crew, 18);
  assert.equal(specification.hullThickness, 20);
  assert.equal(specification.hullMass, 2.025);
  assert.equal(specification.hullProtection, 240);
  assert.equal(specification.batteryCapacity, 2_500);
  assert.equal(specification.generatorOutput, 1_250);
  assert.equal(specification.shieldCapacity, 12.5);
  assert.equal(specification.gunCount, 20);
});

test("a tonnage override is authoritative for all dependent values", () => {
  const specification = calculateShipSpecification({ ...standardShipDesign("II"), mode: "custom", length: 75, tonnageOverride: 35 });
  assert.equal(specification.tonnage, 35);
  assert.equal(specification.crew, 21);
  assert.equal(Number(specification.shieldCapacity.toFixed(3)), 14.583);
  assert.equal(specification.gunCount, 23);
});

test("each standard Mk uses its specified component allocation", () => {
  const expectedBatteryDivisors = { I: 5, II: 12, III: 13, IV: 10, V: 5 };

  for (const [mark, batteryDivisor] of Object.entries(expectedBatteryDivisors)) {
    const specification = calculateShipSpecification(standardShipDesign(mark));
    const batteryMass = specification.tonnage / batteryDivisor;

    assert.equal(specification.batteryMass, batteryMass, `Mk-${mark} battery`);
    assert.equal(specification.generatorMass, batteryMass / 2, `Mk-${mark} generator`);
    assert.equal(specification.shieldMass, batteryMass / 2, `Mk-${mark} shields`);
    assert.equal(specification.gunMass, batteryMass * 2, `Mk-${mark} guns`);
  }
});

test("component mass overrides recalculate only their dependent ship values", () => {
  const specification = calculateShipSpecification({
    ...standardShipDesign("II"), mode: "custom", length: 75, tonnageOverride: 30,
    batteryMassOverride: 4, generatorMassOverride: 3, shieldMassOverride: 2, gunMassOverride: 1,
  });

  assert.equal(specification.batteryCapacity, 4_000);
  assert.equal(specification.generatorOutput, 3_000);
  assert.equal(specification.shieldCapacity, 20);
  assert.equal(specification.gunRate, 0.4);
  assert.equal(specification.gunPower, 0.4);
  assert.equal(specification.gunCount, 4);
  assert.equal(specification.freeTonnage, 17.975);
});

test("a hull-thickness override recalculates hull mass, protection, and payload", () => {
  const specification = calculateShipSpecification({ ...standardShipDesign("II"), hullThicknessOverride: 25 });

  assert.equal(specification.hullMass, 1.62);
  assert.equal(specification.hullProtection, 300);
  assert.equal(Number(specification.freeTonnage.toFixed(3)), 8.38);
});
