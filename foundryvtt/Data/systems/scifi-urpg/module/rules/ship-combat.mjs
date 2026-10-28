import { rollN5 } from "./dice.mjs";
import { combineSkillValues } from "./skills.mjs";

export const SHIP_RANGE_BASELINE_METERS = 1_000;
export const DILITHIUM_KWS_PER_TONNE = 360_000_000;

function number(value) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

/** The normal range curve, shifted so that one kilometre is neutral. */
export function shipRangePenalty(weapon, distance) {
  const meters = Math.max(0, number(distance));
  if (meters <= 0) return 0;

  const modifier = number(weapon?.rangeModifier);
  return Math.min(0, -6 * Math.log2(meters / SHIP_RANGE_BASELINE_METERS) + modifier);
}

export function shipGunneryTotal(gunners = []) {
  const scores = gunners
    .map((gunner) => number(gunner?.system?.skills?.Eingebettete?.value))
    .filter((score) => score > 0);
  return scores.length ? combineSkillValues(scores) : 0;
}

/**
 * Resolve one independent weapon attack.
 *
 * Shields are an omnidirectional energy pool: damage absorbed by the shield
 * reduces only its available charge.  It never degrades a component.
 */
export function resolveShipAttack({ attacker, target, weapon, gunners = [], bonus = 0, distance = 0, roll = rollN5() } = {}) {
  const gunnery = shipGunneryTotal(gunners);
  const rangePenalty = shipRangePenalty(weapon, distance);
  const weaponBonus = number(weapon?.system?.accuracy);
  const attackBonus = number(bonus);
  const result = gunnery + attackBonus + weaponBonus + rangePenalty + number(roll?.total);
  const hit = result > 0;
  const shieldsBefore = Math.max(0, number(target?.system?.shields?.value));
  const hullBefore = Math.max(0, number(target?.system?.hull?.value));

  const rawDamage = hit
    ? Math.max(0, Math.floor(result / 5) + Math.max(0, number(weapon?.system?.damage)))
    : 0;
  const shieldDamage = Math.min(shieldsBefore, rawDamage);
  const hullDamage = Math.max(0, rawDamage - shieldDamage);
  const shieldsAfter = shieldsBefore - shieldDamage;
  const hullAfter = Math.max(0, hullBefore - hullDamage);

  return {
    attacker,
    target,
    weapon,
    gunners,
    gunnery,
    bonus: attackBonus,
    rangePenalty,
    weaponBonus,
    distance: Math.max(0, number(distance)),
    roll,
    result,
    hit,
    rawDamage,
    shieldDamage,
    hullDamage,
    shieldsBefore,
    shieldsAfter,
    hullBefore,
    hullAfter,
    updateData: hit ? {
      "system.shields.value": shieldsAfter,
      "system.hull.value": hullAfter,
    } : {},
  };
}

/** Move stored battery charge into the omnidirectional shield pool. */
export function rechargeShields(ship) {
  const shieldValue = Math.max(0, number(ship?.system?.shields?.value));
  const shieldMax = Math.max(shieldValue, number(ship?.system?.shields?.max));
  const energyValue = Math.max(0, number(ship?.system?.energy?.value));
  const transfer = Math.min(shieldMax - shieldValue, energyValue);
  return {
    transfer,
    updateData: transfer > 0 ? {
      "system.shields.value": shieldValue + transfer,
      "system.energy.value": energyValue - transfer,
    } : {},
  };
}

/** Generate one round of battery charge: reactor kW × ship mass in tonnes. */
export function generateReactorEnergy(ship) {
  const output = Math.max(0, number(ship?.system?.reactor?.output));
  const mass = Math.max(0, number(ship?.system?.mass));
  const energy = Math.max(0, number(ship?.system?.energy?.value));
  const energyMax = Math.max(energy, number(ship?.system?.energy?.max));
  const generated = Math.min(Math.floor(output * mass), energyMax - energy);
  return {
    generated,
    updateData: generated > 0 ? { "system.energy.value": energy + generated } : {},
  };
}

/**
 * Apply an acceleration vector. Coasting costs nothing; only a velocity
 * change draws energy. One energy unit represents one kWs in the sheet.
 */
export function applyShipAcceleration(ship, { x = 0, y = 0 } = {}) {
  const accelerationX = number(x);
  const accelerationY = number(y);
  const mass = Math.max(0, number(ship?.system?.mass));
  const energy = Math.max(0, number(ship?.system?.energy?.value));
  const cost = Math.ceil((Math.abs(accelerationX) + Math.abs(accelerationY)) * mass);
  const affordable = cost <= energy;
  const velocityX = number(ship?.system?.movement?.velocityX);
  const velocityY = number(ship?.system?.movement?.velocityY);

  return {
    cost,
    affordable,
    velocityX: affordable ? velocityX + accelerationX : velocityX,
    velocityY: affordable ? velocityY + accelerationY : velocityY,
    updateData: affordable ? {
      "system.movement.velocityX": velocityX + accelerationX,
      "system.movement.velocityY": velocityY + accelerationY,
      "system.energy.value": energy - cost,
    } : {},
  };
}

/** Convert Dilithium directly into stored energy using 100 GWh per tonne. */
export function convertDilithium(ship, tonnes) {
  const available = Math.max(0, number(ship?.system?.dilithium));
  const requested = Math.max(0, number(tonnes));
  const used = Math.min(available, requested);
  const energy = Math.max(0, number(ship?.system?.energy?.value));
  const energyMax = Math.max(energy, number(ship?.system?.energy?.max));
  const room = Math.max(0, energyMax - energy);
  const required = room / DILITHIUM_KWS_PER_TONNE;
  const converted = Math.min(used, required);
  const gained = converted * DILITHIUM_KWS_PER_TONNE;
  return {
    tonnes: converted,
    energy: gained,
    updateData: converted > 0 ? {
      "system.dilithium": available - converted,
      "system.energy.value": energy + gained,
    } : {},
  };
}
