export const DIMENSION_MIN = -50;
export const DIMENSION_MAX = 50;

export function clampDimension(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(DIMENSION_MAX, Math.max(DIMENSION_MIN, Math.round(number)));
}

export function buildDimensionRows(value) {
  const current = clampDimension(value);
  const v = current / 10;

  return [
    {
      label: "Accuracy",
      value: `${Math.max(0, Math.round(100 * (1 - 1 / (2 ** v))))} % – ${v > 0 ? Math.round(100 / (1 - 1 / (2 ** v))) : "∞"} %`
    },
    {
      label: "Healing",
      value: `${Math.round(8 * 2 ** -v) / 8} day/pt`
    },
    {
      label: "Initiative",
      value: `${formatDimensionSeconds(initiativeSecondsForDimension(current))} s`
    },
    {
      label: "Move",
      value: `${formatDimensionMetersPerSecond(moveMetersPerSecondForDimension(current))} m/s = ${Math.round(72 * 2 ** (v / 2)) / 8} km/h`
    },
    {
      label: "Time/Speed",
      value: `${Math.round(100 * 2 ** -v)} %`
    },
    {
      label: "Yield",
      value: `${Math.round(8 * 2 ** v) / 8}`
    },
    {
      label: "Range",
      value: `${Math.max(5, Math.round(5 * 2 ** (-(10 / 6) * v)))} m`
    },
    {
      label: "Accident",
      value: `${Math.max(0, Math.min(100, -20 * v))} %`
    }
  ];
}

export function initiativeSecondsForDimension(value) {
  const v = clampDimension(value) / 10;
  return Math.round(32 * 2 ** -v) / 8;
}

export function moveMetersPerSecondForDimension(value) {
  const v = clampDimension(value) / 10;
  return Math.round(20 * 2 ** (v / 2)) / 8;
}

export function formatDimensionSeconds(seconds) {
  return Number.isInteger(seconds) ? String(seconds) : seconds.toFixed(3);
}

export function formatDimensionMetersPerSecond(metersPerSecond) {
  return Number.isInteger(metersPerSecond) ? String(metersPerSecond) : metersPerSecond.toFixed(3);
}
