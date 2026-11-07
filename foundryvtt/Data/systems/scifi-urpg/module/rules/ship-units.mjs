/** Persisted ship resources use these integer base units. */
export const SHIP_UNITS_VERSION = 3;
export const BEP_PER_KBEP = 1_000;
export const KWS_PER_MWS = 1_000;
export const SHIP_OUTPUT_DIVISOR = 10;

function number(value) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

export function kBepToBep(value) {
  return Math.max(0, Math.round(number(value) * BEP_PER_KBEP));
}

export function bepToKBep(value) {
  return Math.max(0, number(value)) / BEP_PER_KBEP;
}

export function mwsToKws(value) {
  return Math.max(0, Math.round(number(value) * KWS_PER_MWS));
}

/** Reduce a persisted operational shield charge to the revised rule scale. */
export function reduceShipOutput(value) {
  return Math.max(0, Math.round(number(value) / SHIP_OUTPUT_DIVISOR));
}

export function kwsToMws(value) {
  return Math.max(0, number(value)) / KWS_PER_MWS;
}

function resourceMigration(resource, prefix, convert, keys = ["value", "max"]) {
  const update = {};
  for (const key of keys) {
    if (resource?.[key] !== undefined) update[`${prefix}.${key}`] = convert(resource[key]);
  }
  return update;
}

/** Return an idempotent update for a legacy Ship system source, if needed. */
export function migrateShipSystemUnits(source = {}, unitsVersion = 0) {
  if (Number(unitsVersion) >= SHIP_UNITS_VERSION) return null;

  const legacyDisplayUnits = Number(unitsVersion) < 2;
  const shieldConversion = legacyDisplayUnits
    ? (value) => reduceShipOutput(kBepToBep(value))
    : Number(unitsVersion) < 3 ? reduceShipOutput : number;
  return {
    "flags.scifi-urpg.shipUnitsVersion": SHIP_UNITS_VERSION,
    ...resourceMigration(source.shields, "system.shields", shieldConversion, ["value"]),
    ...(legacyDisplayUnits ? resourceMigration(source.energy, "system.energy", mwsToKws, ["value"]) : {}),
    "system.hull.-=max": null,
    "system.shields.-=max": null,
    "system.energy.-=max": null,
    "system.-=reactor": null,
  };
}

/** Drop persisted weapon output; it is now derived from the ship design. */
export function migrateShipWeaponSystemUnits(source = {}, unitsVersion = 0) {
  if (Number(unitsVersion) >= SHIP_UNITS_VERSION) return null;
  return {
    "flags.scifi-urpg.shipUnitsVersion": SHIP_UNITS_VERSION,
    "system.-=bep": null,
    "system.-=energy": null,
  };
}
