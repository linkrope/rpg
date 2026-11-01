/** Standard hull patterns. A custom design keeps its originating pattern as its default. */
export const SHIP_PROFILES = Object.freeze({
  I: Object.freeze({ length: 40, hullThickness: 10 }),
  II: Object.freeze({ length: 60, hullThickness: 20 }),
  III: Object.freeze({ length: 100, hullThickness: 30 }),
  IV: Object.freeze({ length: 150, hullThickness: 40 }),
  V: Object.freeze({ length: 400, hullThickness: 50 }),
});

function number(value, fallback = 0) {
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
}

function roundTo(value, increment) {
  return Math.round(value / increment) * increment;
}

/**
 * The table's values are a cubic displacement estimate, rounded to useful
 * table values. The thresholds deliberately reproduce marks I–V exactly.
 */
export function niceRoundedTonnage(length) {
  const metres = Math.max(0, number(length));
  const rawTonnage = metres ** 3 / 15_000;
  const increment = metres <= 40 ? 1 : metres <= 100 ? 5 : metres <= 150 ? 10 : 100;
  return roundTo(rawTonnage, increment);
}

export function standardShipDesign(mark = "I") {
  const baseMark = SHIP_PROFILES[mark] ? mark : "I";
  return {
    mode: "standard",
    baseMark,
    length: SHIP_PROFILES[baseMark].length,
    tonnageOverride: null,
    hullThicknessOverride: null,
    batteryMassOverride: null,
    generatorMassOverride: null,
    shieldMassOverride: null,
    gunMassOverride: null,
  };
}

/**
 * Converts the small, persisted design input into the complete ship table.
 * This is intentionally pure so the sheet, data model, and tests use exactly
 * the same formulas.
 */
export function calculateShipSpecification(design = {}) {
  const profile = SHIP_PROFILES[design.baseMark] ?? SHIP_PROFILES.I;
  const length = Math.max(0, number(design.length, profile.length));
  const requestedTonnage = design.tonnageOverride;
  const tonnage = requestedTonnage === null || requestedTonnage === undefined || requestedTonnage === ""
    ? niceRoundedTonnage(length)
    : Math.max(0, number(requestedTonnage));
  const surface = length * length * 6;
  const crew = Math.floor((length / 10 + tonnage) / 2);
  const requestedHullThickness = design.hullThicknessOverride;
  const hullThickness = requestedHullThickness === null || requestedHullThickness === undefined || requestedHullThickness === ""
    ? profile.hullThickness
    : Math.max(1, number(requestedHullThickness));
  const hullMass = hullThickness * surface * 3 / 1_000_000;
  const hullProtection = 12 * hullThickness;
  const recommendedComponentMass = tonnage / 8;
  const componentMass = (value) => value === null || value === undefined || value === ""
    ? recommendedComponentMass
    : Math.max(0, number(value));
  const batteryMass = componentMass(design.batteryMassOverride);
  const batteryCapacity = 1_000 * batteryMass;
  const generatorMass = componentMass(design.generatorMassOverride);
  const generatorOutput = 1_000 * generatorMass;
  const shieldMass = componentMass(design.shieldMassOverride);
  const shieldCapacity = 100 * shieldMass;
  const gunMass = componentMass(design.gunMassOverride);
  const gunRate = 10 * gunMass / 2.5;
  const gunPower = 200 * gunMass;
  const freeTonnage = tonnage - hullMass - batteryMass - generatorMass - shieldMass - gunMass;
  const gunCount = Math.floor(gunRate);

  return {
    length, tonnage, surface, crew, hullThickness, hullMass, hullProtection, recommendedComponentMass,
    batteryMass, batteryCapacity, generatorMass, generatorOutput,
    shieldMass, shieldCapacity, gunMass, gunRate, gunPower, freeTonnage, gunCount,
  };
}
