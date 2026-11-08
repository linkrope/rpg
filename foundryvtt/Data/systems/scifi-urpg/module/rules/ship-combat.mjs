import { rollN5 } from "./dice.mjs";
import { combineSkillValues } from "./skills.mjs";
import { BEP_PER_KBEP } from "./ship-units.mjs";
import { calculateShipSpecification } from "./ship-design.mjs";

export const SHIP_RANGE_BASELINE_METERS = 5_000;
export const DILITHIUM_KWS_PER_TONNE = 360_000_000;
export { BEP_PER_KBEP } from "./ship-units.mjs";
// One kBEP requires 10 MWs (10,000 kWs), or 0.1 BEP per stored kWs.
export const SHIELD_BEP_PER_KWS = 0.1;

function number(value) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

/** The normal range curve, shifted so that five kilometres is neutral. */
export function shipRangePenalty(weapon, distance) {
  const meters = Math.max(0, number(distance));
  if (meters <= 0) return 0;

  const modifier = number(weapon?.rangeModifier);
  return Math.min(0, -6 * Math.log2(meters / SHIP_RANGE_BASELINE_METERS) + modifier);
}

function shipWeaponCount(ship) {
  const items = ship?.items;
  const entries = items?.values ? [...items.values()] : Array.isArray(items) ? items : [];
  return Math.max(1, entries.filter((item) => item?.type === "shipWeapon").length);
}

/**
 * Weapon effect is derived from the ship's gun-mass allocation. Named weapon
 * items select targets and range modifiers, but never carry their own damage
 * or energy budget. Multiple entries divide the allocated output equally.
 */
export function shipWeaponOutput(ship) {
  const specification = calculateShipSpecification(ship?.system?.design);
  const weapons = shipWeaponCount(ship);
  return {
    damage: Math.max(0, Math.round(number(specification.gunRate) * BEP_PER_KBEP / weapons)),
    energy: Math.max(0, Math.round(number(specification.gunPowerKws) / weapons)),
  };
}

/** Energy drawn from the ship battery for one derived weapon shot. */
export function shipWeaponEnergyCost(ship) {
  return shipWeaponOutput(ship).energy;
}

/** One crew-member entry is a physical person, even when several entries use the same Actor. */
export function crewMemberRoleValue(member, skill) {
  const actor = member?.actor ?? member;
  const skillValue = number(actor?.system?.skills?.[skill]?.value);
  const damage = Math.max(0, number(actor?.system?.health?.damage));
  const multitaskingPenalty = member?.pilot && member?.gunner ? 5 : 0;
  return skillValue - multitaskingPenalty - damage;
}

export function shipCrewRoleTotal(crewMembers = [], role, skill) {
  // TODO(rules): confirm whether negative values from injury/multitasking are
  // legal. Until then, pass them to the normal combined-effort calculation.
  const scores = crewMembers
    .filter((member) => member?.[role])
    .map((member) => crewMemberRoleValue(member, skill));
  return scores.length ? combineSkillValues(scores) : 0;
}

export function shipGunneryTotal(gunners = []) {
  return shipCrewRoleTotal(gunners.map((gunner) => ({ actor: gunner, gunner: true })), "gunner", "Eingebettete");
}

export function shipPilotEvasionTotal(pilots = []) {
  return shipCrewRoleTotal(pilots.map((pilot) => ({ actor: pilot, pilot: true })), "pilot", "Raumfahrzeuge");
}

/** Structural damage reduces every ship crew action by its lost tonnage. */
export function shipDamagePenalty(ship) {
  return Math.max(0, number(ship?.system?.damage));
}

/**
 * Resolve one independent weapon attack.
 *
 * Shields absorb stored BEP first. The design-derived hull is fixed armour:
 * only damage that exceeds it destroys ship mass at one tonne per kBEP.
 */
export function resolveShipAttack({
  attacker,
  target,
  weapon,
  crewMembers,
  targetCrewMembers,
  // Retained for callers that have not yet moved to crew-member rows.
  gunners = [],
  pilots = [],
  bonus = 0,
  distance = 0,
  roll = rollN5(),
} = {}) {
  const attackingCrew = crewMembers ?? gunners.map((actor) => ({ actor, gunner: true }));
  const defendingCrew = targetCrewMembers ?? pilots.map((actor) => ({ actor, pilot: true }));
  const gunneryBeforeDamage = shipCrewRoleTotal(attackingCrew, "gunner", "Eingebettete");
  const attackerDamage = shipDamagePenalty(attacker);
  const gunnery = gunneryBeforeDamage - attackerDamage;
  // TODO(rules): confirm the provisional rule that an unpiloted ship evades at 0.
  const evasionBeforeDamage = shipCrewRoleTotal(defendingCrew, "pilot", "Raumfahrzeuge");
  const defenderDamage = shipDamagePenalty(target);
  const evasion = evasionBeforeDamage - defenderDamage;
  const rangePenalty = shipRangePenalty(weapon, distance);
  const weaponOutput = shipWeaponOutput(attacker);
  const energyCost = weaponOutput.energy;
  const energyBefore = Math.max(0, number(attacker?.system?.energy?.value));
  const attackBonus = number(bonus);
  const result = gunnery + attackBonus + rangePenalty + number(roll?.total) - evasion;
  const hit = result > 0;
  const shieldsBefore = Math.max(0, number(target?.system?.shields?.value));
  const hullArmor = Math.max(0, number(calculateShipSpecification(target?.system?.design).hullProtection));
  const damageBefore = Math.max(0, number(target?.system?.damage));

  // Ship gunnery determines whether a shot hits; damage is derived from the
  // attacker's gun allocation. The to-hit ÷ 5 bonus belongs to character BEP
  // combat.
  const rawDamage = hit ? weaponOutput.damage : 0;
  const shieldDamage = Math.min(shieldsBefore, rawDamage);
  const unshieldedDamage = Math.max(0, rawDamage - shieldDamage);
  const hullArmorDamage = Math.min(hullArmor, unshieldedDamage);
  const hullDamage = Math.max(0, unshieldedDamage - hullArmorDamage);
  const shieldsAfter = shieldsBefore - shieldDamage;
  const shipDamage = hullDamage / BEP_PER_KBEP;
  const damageAfter = damageBefore + shipDamage;

  return {
    attacker,
    target,
    weapon,
    crewMembers: attackingCrew,
    targetCrewMembers: defendingCrew,
    gunneryBeforeDamage,
    attackerDamage,
    gunnery,
    evasionBeforeDamage,
    defenderDamage,
    evasion,
    bonus: attackBonus,
    rangePenalty,
    energyCost,
    energyBefore,
    energyAfter: energyBefore - energyCost,
    distance: Math.max(0, number(distance)),
    roll,
    result,
    hit,
    rawDamage,
    shieldDamage,
    hullArmor,
    hullArmorDamage,
    hullDamage,
    shipDamage,
    shieldsBefore,
    shieldsAfter,
    damageBefore,
    damageAfter,
    updateData: hit ? {
      "system.shields.value": shieldsAfter,
      "system.damage": damageAfter,
    } : {},
    attackerUpdateData: energyCost > 0 ? {
      "system.energy.value": energyBefore - energyCost,
    } : {},
  };
}

/** Move stored kWs into the omnidirectional shield pool at 10 MWs per kBEP. */
export function rechargeShields(ship) {
  const shieldValue = Math.max(0, number(ship?.system?.shields?.value));
  const shieldMax = Math.max(shieldValue, number(calculateShipSpecification(ship?.system?.design).shieldCapacityBep));
  const energyValue = Math.max(0, number(ship?.system?.energy?.value));
  const transfer = Math.min(shieldMax - shieldValue, energyValue * SHIELD_BEP_PER_KWS);
  const energySpent = Math.ceil(transfer / SHIELD_BEP_PER_KWS);
  return {
    transfer,
    updateData: transfer > 0 ? {
      "system.shields.value": shieldValue + transfer,
      "system.energy.value": energyValue - energySpent,
    } : {},
  };
}

/** Generate battery charge from total reactor kW, stored as kWs, for whole rounds. */
export function generateReactorEnergy(ship, rounds = 1) {
  const output = Math.max(0, number(calculateShipSpecification(ship?.system?.design).generatorOutput));
  const roundCount = Math.max(0, Math.floor(number(rounds)));
  const energy = Math.max(0, number(ship?.system?.energy?.value));
  const energyMax = Math.max(energy, number(calculateShipSpecification(ship?.system?.design).batteryCapacityKws));
  const generated = Math.min(output * roundCount, energyMax - energy);
  return {
    rounds: roundCount,
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
  const energyMax = Math.max(energy, number(calculateShipSpecification(ship?.system?.design).batteryCapacityKws));
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
