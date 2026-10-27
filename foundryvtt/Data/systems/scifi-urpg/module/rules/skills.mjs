export function combineTwoSkills(firstValue, secondValue) {
  const a = Math.max(firstValue, secondValue);
  const b = Math.min(firstValue, secondValue);

  return Math.round(a + (5 * Math.log(1 + Math.exp((b - a) * Math.log(2) / 5))) / Math.log(2));
}

export function combineSkillValues(values) {
  const sortedValues = values
    .map((value) => Number(value) || 0)
    .sort((a, b) => a - b);

  if (!sortedValues.length) return 0;

  return sortedValues.slice(1).reduce((combined, value) => combineTwoSkills(combined, value), sortedValues[0]);
}

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
    const combinedValue = combineSkillValues(contributions.map((contribution) => contribution.adjustedValue));
    return `${combinedValue} + ${Number(roll.plus)} - ${Number(roll.minus)}`;
  }

  const terms = contributions.map((contribution) => {
    const value = Number(contribution.value) || 0;
    const damage = Math.max(0, Number(contribution.damage) || 0);
    return damage > 0 ? `${value} - ${damage} (damage)` : String(value);
  });
  const base = terms[0] ?? "0";

  return `${base} + ${Number(roll.plus)} - ${Number(roll.minus)}`;
}
