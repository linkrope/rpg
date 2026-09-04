export function d(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

export function p5() {
  let value = d(5);
  let total = 0;

  while (value !== 1) {
    total += 1;
    value = d(5);
  }

  return total;
}

export function rollP5() {
  return { total: p5() };
}

export function rollN5() {
  const plus = p5();
  const minus = p5();

  return {
    plus,
    minus,
    total: plus - minus
  };
}
