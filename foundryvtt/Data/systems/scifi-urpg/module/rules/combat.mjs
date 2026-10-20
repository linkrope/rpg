import {
  ARMOR_MATERIALS,
  BASE_HIT_ZONE_PCT,
  RUESTUNGSEFFEKT,
  SKILL_TO_RUESTUNGSEFFEKT,
  fmtArmor
} from "../constants.mjs";
import { rollN5 } from "./dice.mjs";
import { buildAttackCard } from "./roll-card.mjs";

export const DEFAULT_AIM_ZONES = ["torso", "legs", "arms", "head"];

export const UNARMED_WEAPON = Object.freeze({
  name: "Unarmed",
  skill: "Waffenlos",
  weight: null,
  hand: 2,
  bep: 2,
  rangeModifier: 0,
  clip: null,
  ammo: null,
  nozzle: null
});

/** Return the equipped embedded weapon, falling back to unarmed when none is selected. */
export function weaponForActor(actor) {
  const selected = actor?.system?.weapon?.selected;
  const item = actor?.items?.get(selected);

  if (item?.type === "weapon") {
    const rangeModifier = Number(item.system.rangeModifier);
    return {
      name: item.name,
      skill: item.system.skill,
      weight: item.system.weight || null,
      hand: item.system.hand,
      bep: item.system.bep,
      rangeModifier: Number.isFinite(rangeModifier) ? rangeModifier : 0,
      clip: item.system.clip,
      ammo: item.system.ammo || null,
      nozzle: item.system.nozzle || null,
      itemId: item.id
    };
  }

  return UNARMED_WEAPON;
}

export function isUnarmedWeapon(weapon) {
  return weapon?.skill === "Waffenlos";
}

/** A weapon without a clip is used as a melee weapon at close range. */
export function isMeleeAttack(weapon, distance) {
  const dist = Number(distance);
  return weapon?.clip == null
    && Number.isFinite(dist) && dist >= 0 && Number(dist.toFixed(1)) <= 1;
}

export function primarilyRangedBonus(weapon) {
  const muzzleVelocity = String(weapon?.nozzle ?? "").trim();
  if (muzzleVelocity.toLowerCase() === "light") return 10;

  const velocity = Number.parseFloat(muzzleVelocity);
  return Number.isFinite(velocity) && velocity > 10 ? 10 : 0;
}

export function rangePenalty(weapon, distance) {
  const dist = Math.max(0, Number(distance) || 0);
  if (dist <= 0 || isUnarmedWeapon(weapon) || isMeleeAttack(weapon, dist)) return 0;

  const modifier = Number(weapon?.rangeModifier);
  return Math.min(0, -6 * Math.log2(dist / 5) + (Number.isFinite(modifier) ? modifier : 0));
}

/** Display precision only; attack and damage calculations retain the original value. */
export function formatAttackResult(outcome) {
  return isUnarmedWeapon(outcome.weapon) ? fmtArmor(outcome.result) : Number(outcome.result).toFixed(1);
}

export function aimTotalPct(aimZones = DEFAULT_AIM_ZONES) {
  return normalizeAimZones(aimZones).reduce((total, zone) => total + (BASE_HIT_ZONE_PCT[zone] ?? 0), 0);
}

export function aimPenalty(aimZones = DEFAULT_AIM_ZONES) {
  const pct = aimTotalPct(aimZones);
  if (pct >= 100 || pct <= 0) return 0;

  return Math.round(5 * Math.log2(100 / pct));
}

export function rollHitZone(aimZones = DEFAULT_AIM_ZONES, random = Math.random) {
  const zones = normalizeAimZones(aimZones);
  const total = zones.reduce((sum, zone) => sum + BASE_HIT_ZONE_PCT[zone], 0);
  const roll = random() * total;
  let cumulative = 0;

  for (const zone of zones) {
    cumulative += BASE_HIT_ZONE_PCT[zone];
    if (roll < cumulative) return zone;
  }

  return zones[zones.length - 1];
}

export function resolveAttack({ attacker, target, skillKey, bonus = 0, distance = 0, aimZones = DEFAULT_AIM_ZONES }) {
  const weapon = weaponForActor(attacker);
  const skillVal = Number(attacker.system.skills?.[skillKey]?.value ?? 0);
  const damagePen = Math.max(0, Number(attacker.system.health?.damage ?? 0));
  const distPen = rangePenalty(weapon, distance);
  const rangedBonus = primarilyRangedBonus(weapon);
  const aimPen = aimPenalty(aimZones);
  const n5 = rollN5();
  const result = skillVal - damagePen + Number(bonus || 0) + rangedBonus + n5.total + distPen - aimPen;
  const hit = result > 0;

  const outcome = {
    attacker,
    target,
    skillKey,
    weapon,
    skillVal,
    damagePen,
    bonus: Number(bonus || 0),
    primarilyRangedBonus: rangedBonus,
    distance: Math.max(0, Number(distance) || 0),
    distPen,
    aimPen,
    roll: n5,
    result,
    hit,
    zone: "",
    rawDamage: 0,
    damage: 0,
    armorBefore: 0,
    armorAfter: 0,
    armorLoss: null,
    newTargetDamage: Number(target.system.health?.damage ?? 0),
    updateData: {}
  };

  if (!hit) return outcome;

  const zone = rollHitZone(aimZones);
  const zoneArmor = target.system.armor?.[zone] ?? {};
  const armorBefore = Number(zoneArmor.battered ?? 0);
  const rawDamage = result / 5 + Number(weapon.bep ?? 0);
  const damage = Math.max(0, Math.round(rawDamage - armorBefore));
  const updateData = {};
  let armorAfter = armorBefore;
  let armorLoss = null;

  if (zoneArmor.material) {
    const material = ARMOR_MATERIALS[zoneArmor.material];
    if (material) {
      const category = SKILL_TO_RUESTUNGSEFFEKT[skillKey] || "geschosswaffe";
      const ruestungseffekt = RUESTUNGSEFFEKT[category];
      const trefferzonenPct = BASE_HIT_ZONE_PCT[zone];
      const eaten = Math.min(rawDamage, armorBefore);
      const loss = (ruestungseffekt / trefferzonenPct) * (material.lossNum / material.lossDenom) * eaten;
      armorAfter = Math.max(0, armorBefore - loss);
      updateData[`system.armor.${zone}.battered`] = armorAfter;
      armorLoss = { ruestungseffekt, trefferzonenPct, material, eaten, loss };
    }
  }

  const currentDamage = Number(target.system.health?.damage ?? 0);
  const newTargetDamage = currentDamage + damage;
  updateData["system.health.damage"] = newTargetDamage;

  return {
    ...outcome,
    zone,
    rawDamage,
    damage,
    armorBefore,
    armorAfter,
    armorLoss,
    newTargetDamage,
    updateData
  };
}


export function attackLogLines(outcome) {
  const lines = [];
  if (!outcome.hit) {
    lines.push({
      type: "miss",
      text: "Miss: no damage"
    });
    return lines;
  }

  const card = buildAttackCard(outcome);
  lines.push({
    type: "damage",
    text: `Damage: ${card.damage.formula} = ${card.damage.result}`
  });

  if (outcome.armorLoss && outcome.armorBefore !== outcome.armorAfter) {
    const { ruestungseffekt, trefferzonenPct, material, eaten } = outcome.armorLoss;
    const calcStr = `(${ruestungseffekt}% (effect) / ${trefferzonenPct}% (zone)) x ${material.lossNum}/${material.lossDenom} (loss) x ${fmtArmor(eaten)} (damage)`;
    lines.push({
      type: "armor",
      text: `Armor damage: ${outcome.zone} ${fmtArmor(outcome.armorBefore)} - ${calcStr} = ${fmtArmor(outcome.armorAfter)}`
    });
  }

  return lines;
}

function normalizeAimZones(aimZones) {
  const zones = Array.from(aimZones ?? []).filter((zone) => BASE_HIT_ZONE_PCT[zone] !== undefined);
  return zones.length ? zones : [...DEFAULT_AIM_ZONES];
}
