import { n5Formula } from "./dice.mjs";
import { combineValues } from "./five-addition.mjs";

export function skillRollTotal(base, damage, n5) {
  return (Number(base) || 0) - Math.max(0, Number(damage) || 0) + (Number(n5) || 0);
}

/**
 * A single skill roll shows its damage penalty. For combined rolls, expose
 * only the calculated combined skill value so the individual contributions
 * remain private.
 */
export function skillRollFormula(contributions, roll) {
  if (contributions.length > 1) {
    const combinedValue = combineValues(contributions.map((contribution) => contribution.adjustedValue));
    return `${combinedValue} ${n5Formula(roll)}`;
  }

  const terms = contributions.map((contribution) => {
    const value = Number(contribution.value) || 0;
    const damage = Math.max(0, Number(contribution.damage) || 0);
    return damage > 0 ? `${value} - ${damage} (damage)` : String(value);
  });
  const base = terms[0] ?? "0";

  return `${base} ${n5Formula(roll)}`;
}
