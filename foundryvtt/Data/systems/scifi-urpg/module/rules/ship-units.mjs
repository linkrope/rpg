/** Persisted ship resources use these integer base units. */
export const SHIP_UNITS_VERSION = 2;
export const BEP_PER_KBEP = 1_000;
export const KWS_PER_MWS = 1_000;

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

export function kwsToMws(value) {
  return Math.max(0, number(value)) / KWS_PER_MWS;
}

function resourceMigration(resource, prefix, convert) {
  const update = {};
  for (const key of ["value", "max"]) {
    if (resource?.[key] !== undefined) update[`${prefix}.${key}`] = convert(resource[key]);
  }
  return update;
}

/** Return an idempotent update for a legacy Ship system source, if needed. */
export function migrateShipSystemUnits(source = {}, unitsVersion = 0) {
  if (Number(unitsVersion) >= SHIP_UNITS_VERSION) return null;
  return {
    "flags.scifi-urpg.shipUnitsVersion": SHIP_UNITS_VERSION,
    ...resourceMigration(source.shields, "system.shields", kBepToBep),
    ...resourceMigration(source.energy, "system.energy", mwsToKws),
  };
}

/** Return an idempotent update for a legacy Ship Weapon system source, if needed. */
export function migrateShipWeaponSystemUnits(source = {}, unitsVersion = 0) {
  if (Number(unitsVersion) >= SHIP_UNITS_VERSION) return null;
  return {
    "flags.scifi-urpg.shipUnitsVersion": SHIP_UNITS_VERSION,
    "system.bep": kBepToBep(source.bep),
    "system.energy": mwsToKws(source.energy),
  };
}
