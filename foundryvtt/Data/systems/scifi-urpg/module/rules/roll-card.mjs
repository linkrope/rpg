import { fmtArmor } from "../constants.mjs";
import { n5Formula } from "./dice.mjs";

/**
 * Build the calculation details shown on an attack roll card.
 *
 * This is deliberately independent of Foundry so that the explanation of an
 * attack can be regression-tested alongside the combat calculation.
 */
export function buildAttackCard(outcome) {
  return {
    attackFormula: attackFormula(outcome),
    damage: outcome.hit ? {
      title: "Damage",
      formula: `${fmtArmor(outcome.result)} / 5 + ${outcome.weapon.bep} (BEP) - ${fmtArmor(outcome.armorBefore)} (${outcome.zone})`,
      result: `${outcome.damage} damage`
    } : null,
    armorLoss: outcome.armorLoss && outcome.armorBefore !== outcome.armorAfter ? {
      title: "Armor Loss",
      formula: armorLossFormula(outcome),
      result: fmtArmor(outcome.armorLoss.loss)
    } : null
  };
}

function attackFormula(outcome) {
  const parts = [`${outcome.skillVal} (skill)`];

  // Fixed modifiers first, so the changing situation and dice result form a
  // distinct second half of the calculation.
  if (outcome.bonus > 0) parts.push(`+ ${outcome.bonus} (modifier)`);
  if (outcome.bonus < 0) parts.push(`- ${Math.abs(outcome.bonus)} (modifier)`);
  if (outcome.distPen < 0) appendSignedPart(parts, outcome.rangeModifier, "range modifier", { integer: true });

  if (outcome.damagePen > 0) parts.push(`- ${outcome.damagePen} (damage)`);
  if (outcome.distPen < 0) {
    appendSignedPart(parts, outcome.rangePen, `range ${outcome.distance.toFixed(1)} ${outcome.distanceUnit ?? "m"}`);
  }
  if (outcome.aimPen > 0) parts.push(`- ${outcome.aimPen} (aim)`);

  parts.push(n5Formula(outcome.roll));

  return parts.join(" ");
}

function appendSignedPart(parts, value, label, { integer = false } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number) || number === 0) return;
  const sign = number > 0 ? "+" : "-";
  const formatted = integer ? String(Math.round(Math.abs(number))) : Math.abs(number).toFixed(1);
  parts.push(`${sign} ${formatted} (${label})`);
}

function armorLossFormula(outcome) {
  const { ruestungseffekt, trefferzonenPct, material, eaten } = outcome.armorLoss;
  return `${ruestungseffekt}% (effect) / ${trefferzonenPct}% (zone) x ${material.lossNum}/${material.lossDenom} (loss) x ${fmtArmor(eaten)} (damage)`;
}
