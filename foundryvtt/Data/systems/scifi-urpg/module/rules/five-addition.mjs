/**
 * Apply the system's five-step addition rule to two values without rounding.
 * Rounding here would make a later reduction depend on the order of values.
 */
function combineTwoValues(firstValue, secondValue) {
  const a = Math.max(firstValue, secondValue);
  const b = Math.min(firstValue, secondValue);

  return a + (5 * Math.log(1 + Math.exp((b - a) * Math.log(2) / 5))) / Math.log(2);
}

/**
 * Combine any number of values with five-step addition, rounding only the
 * final result. The caller's ordering is immaterial.
 */
export function combineValues(values) {
  const numericValues = values.map((value) => Number(value) || 0);

  if (!numericValues.length) return 0;

  return Math.round(numericValues.reduce(combineTwoValues));
}
