import { fmtArmor } from "../constants.mjs";

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

  if (outcome.damagePen > 0) parts.push(`- ${outcome.damagePen} (damage)`);
  if (outcome.bonus > 0) parts.push(`+ ${outcome.bonus} (modifier)`);
  if (outcome.bonus < 0) parts.push(`- ${Math.abs(outcome.bonus)} (modifier)`);
  if (outcome.primarilyRangedBonus > 0) parts.push(`+ ${outcome.primarilyRangedBonus} (ranged)`);
  if (outcome.distPen < 0) parts.push(`- ${Math.abs(outcome.distPen).toFixed(1)} (distance ${outcome.distance.toFixed(1)} m)`);
  if (outcome.aimPen > 0) parts.push(`- ${outcome.aimPen} (aim)`);

  parts.push(`+ ${outcome.roll.plus}`);
  parts.push(`- ${outcome.roll.minus}`);

  return parts.join(" ");
}

function armorLossFormula(outcome) {
  const { ruestungseffekt, trefferzonenPct, material, eaten } = outcome.armorLoss;
  return `${ruestungseffekt}% (effect) / ${trefferzonenPct}% (zone) x ${material.lossNum}/${material.lossDenom} (loss) x ${fmtArmor(eaten)} (damage)`;
}
