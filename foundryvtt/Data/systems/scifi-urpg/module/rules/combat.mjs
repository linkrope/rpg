import {
  ARMOR_MATERIALS,
  BASE_HIT_ZONE_PCT,
  RUESTUNGSEFFEKT,
  SKILL_TO_RUESTUNGSEFFEKT,
  WEAPON_PRESETS,
  fmtArmor
} from "../constants.mjs";
import { rollN5 } from "./dice.mjs";

export const DEFAULT_AIM_ZONES = ["torso", "legs", "arms", "head"];

export function weaponPresetFor(name) {
  return WEAPON_PRESETS.find((weapon) => weapon.name === name) ?? WEAPON_PRESETS[0];
}

export function parseRangeMeters(range) {
  if (typeof range === "number") return range;
  if (!range) return 0;

  return parseInt(String(range).replace(/[^\d]/g, ""), 10) || 0;
}

export function rangePenalty(weapon, distance) {
  const range = parseRangeMeters(weapon?.range);
  const dist = Math.max(0, Number(distance) || 0);
  if (!range || range <= 0 || dist <= 0) return 0;

  return Math.round(Math.max(0, dist / range - 1) * 5);
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
  const weapon = weaponPresetFor(attacker.system.weapon?.selected);
  const skillVal = Number(attacker.system.skills?.[skillKey]?.value ?? 0);
  const damagePen = Math.max(0, Number(attacker.system.health?.damage ?? 0));
  const distPen = rangePenalty(weapon, distance);
  const aimPen = aimPenalty(aimZones);
  const n5 = rollN5();
  const result = skillVal - damagePen + Number(bonus || 0) + n5.total - distPen - aimPen;
  const hit = result > 0;

  const outcome = {
    attacker,
    target,
    skillKey,
    weapon,
    skillVal,
    damagePen,
    bonus: Number(bonus || 0),
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
    targetDown: false,
    updateData: {}
  };

  if (!hit) return outcome;

  const zone = rollHitZone(aimZones);
  const zoneArmor = target.system.armor?.[zone] ?? {};
  const armorBefore = Number(zoneArmor.battered ?? 0);
  const rawDamage = Math.round(result / 5) + Number(weapon.bep ?? 0);
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
  const maxDamage = Math.max(1, Number(target.system.health?.max ?? 20));
  const newTargetDamage = Math.min(maxDamage, currentDamage + damage);
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
    targetDown: newTargetDamage >= maxDamage,
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

  lines.push({
    type: "damage",
    text: `Damage: ${outcome.result}/5 + ${outcome.weapon.bep} (weapon) - ${fmtArmor(outcome.armorBefore)} (${outcome.zone}) = ${outcome.damage}`
  });

  if (outcome.armorLoss && outcome.armorBefore !== outcome.armorAfter) {
    const { ruestungseffekt, trefferzonenPct, material, eaten } = outcome.armorLoss;
    const calcStr = `(${ruestungseffekt}% (effect) / ${trefferzonenPct}% (zone)) x ${material.lossNum}/${material.lossDenom} (loss) x ${fmtArmor(eaten)} (damage)`;
    lines.push({
      type: "armor",
      text: `Armor damage: ${outcome.zone} ${fmtArmor(outcome.armorBefore)} - ${calcStr} = ${fmtArmor(outcome.armorAfter)}`
    });
  }

  if (outcome.targetDown) {
    lines.push({
      type: "dead",
      text: `${outcome.target.name} is down!`
    });
  }

  return lines;
}

function normalizeAimZones(aimZones) {
  const zones = Array.from(aimZones ?? []).filter((zone) => BASE_HIT_ZONE_PCT[zone] !== undefined);
  return zones.length ? zones : [...DEFAULT_AIM_ZONES];
}
