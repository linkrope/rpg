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
  assert.equal(specification.batteryCapacity, 3_750);
  assert.equal(specification.gunCount, 15);
});

test("a tonnage override is authoritative for all dependent values", () => {
  const specification = calculateShipSpecification({ ...standardShipDesign("II"), mode: "custom", length: 75, tonnageOverride: 35 });
  assert.equal(specification.tonnage, 35);
  assert.equal(specification.crew, 21);
  assert.equal(specification.shieldCapacity, 437.5);
  assert.equal(specification.gunCount, 17);
});

test("component mass overrides recalculate only their dependent ship values", () => {
  const specification = calculateShipSpecification({
    ...standardShipDesign("II"), mode: "custom", length: 75, tonnageOverride: 30,
    batteryMassOverride: 4, generatorMassOverride: 3, shieldMassOverride: 2, gunMassOverride: 1,
  });

  assert.equal(specification.batteryCapacity, 4_000);
  assert.equal(specification.generatorOutput, 3_000);
  assert.equal(specification.shieldCapacity, 200);
  assert.equal(specification.gunRate, 4);
  assert.equal(specification.gunPower, 200);
  assert.equal(specification.gunCount, 4);
  assert.equal(specification.freeTonnage, 17.975);
});

test("a hull-thickness override recalculates hull mass, protection, and payload", () => {
  const specification = calculateShipSpecification({ ...standardShipDesign("II"), hullThicknessOverride: 25 });

  assert.equal(specification.hullMass, 1.62);
  assert.equal(specification.hullProtection, 300);
  assert.equal(Number(specification.freeTonnage.toFixed(3)), 5.88);
});
