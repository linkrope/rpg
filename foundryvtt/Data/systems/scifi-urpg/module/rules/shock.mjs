import { rollN5 } from "./dice.mjs";

/** Damage is displayed on a 20-point token bar, but it is never capped there. */
export const SHOCK_DAMAGE_LIMIT = 20;

export function resolveShock({ damage = 0, roll = rollN5() } = {}) {
  const totalDamage = Math.max(0, Math.round(Number(damage) || 0));
  const result = SHOCK_DAMAGE_LIMIT - totalDamage + roll.total;

  return {
    damage: totalDamage,
    roll,
    result,
    conscious: result > 0
  };
}

export function shockFormula(outcome) {
  return `${SHOCK_DAMAGE_LIMIT} - ${outcome.damage} (damage) + ${outcome.roll.plus} - ${outcome.roll.minus}`;
}
