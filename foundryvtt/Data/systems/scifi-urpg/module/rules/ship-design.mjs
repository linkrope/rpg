/** Standard hull patterns. A custom design keeps its originating pattern as its default. */
export const SHIP_PROFILES = Object.freeze({
  I: Object.freeze({ length: 40, hullThickness: 10, batteryTonnageDivisor: 5 }),
  II: Object.freeze({ length: 60, hullThickness: 20, batteryTonnageDivisor: 12 }),
  III: Object.freeze({ length: 100, hullThickness: 30, batteryTonnageDivisor: 13 }),
  IV: Object.freeze({ length: 150, hullThickness: 40, batteryTonnageDivisor: 10 }),
  V: Object.freeze({ length: 400, hullThickness: 50, batteryTonnageDivisor: 5 }),
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
  // Each Mk assigns a different battery share. Generator and shields each
  // receive half that mass; guns receive twice it. Keeping this allocation
  // here makes the sheet, derived data, and newly-created weapons agree.
  const recommendedBatteryMass = tonnage / profile.batteryTonnageDivisor;
  const recommendedComponentMasses = Object.freeze({
    battery: recommendedBatteryMass,
    generator: recommendedBatteryMass / 2,
    shield: recommendedBatteryMass / 2,
    gun: recommendedBatteryMass * 2,
  });
  const componentMass = (value, recommendedMass) => value === null || value === undefined || value === ""
    ? recommendedMass
    : Math.max(0, number(value));
  const batteryMass = componentMass(design.batteryMassOverride, recommendedComponentMasses.battery);
  const batteryCapacity = 1_000 * batteryMass;
  const generatorMass = componentMass(design.generatorMassOverride, recommendedComponentMasses.generator);
  const generatorOutput = 1_000 * generatorMass;
  const shieldMass = componentMass(design.shieldMassOverride, recommendedComponentMasses.shield);
  const shieldCapacity = 100 * shieldMass;
  const gunMass = componentMass(design.gunMassOverride, recommendedComponentMasses.gun);
  const gunRate = 10 * gunMass / 2.5;
  const gunPower = gunRate / 10;
  const shieldCapacityBep = Math.round(shieldCapacity * 1_000);
  const batteryCapacityKws = Math.round(batteryCapacity * 1_000);
  const gunPowerKws = Math.round(gunPower * 1_000);
  const freeTonnage = tonnage - hullMass - batteryMass - generatorMass - shieldMass - gunMass;
  const gunCount = Math.floor(gunRate);

  return {
    length, tonnage, surface, crew, hullThickness, hullMass, hullProtection,
    // Retained as the battery recommendation for sheet-module compatibility.
    recommendedComponentMass: recommendedComponentMasses.battery, recommendedComponentMasses,
    batteryMass, batteryCapacity, generatorMass, generatorOutput,
    shieldMass, shieldCapacity, shieldCapacityBep, gunMass, gunRate, gunPower, gunPowerKws,
    batteryCapacityKws, freeTonnage, gunCount,
  };
}
