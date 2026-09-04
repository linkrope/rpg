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
      value: `${Math.round(100 * (1 - 1 / (2.5 * 2 ** v)))} % - ${Math.round(100 / (1 - 1 / (2.5 * 2 ** v)))} %`
    },
    {
      label: "Combat",
      value: `${formatDimensionSeconds(initiativeSecondsForDimension(current))} s`
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
      value: `${Math.round(40 * 2 ** (v / 2)) / 16} m/s = ${Math.round(144 * 2 ** (v / 2)) / 16} km/h`
    },
    {
      label: "Speed",
      value: `${Math.round(400 * 2 ** -v)} %`
    },
    {
      label: "Yield",
      value: `${Math.round(8 * 2 ** v) / 8}`
    },
    {
      label: "Yield (T)",
      value: `${Math.round(8 * 2 ** -v) / 8}`
    }
  ];
}

export function initiativeSecondsForDimension(value) {
  const v = clampDimension(value) / 10;
  return Math.round(32 * 2 ** -v) / 8;
}

export function formatDimensionSeconds(seconds) {
  return Number.isInteger(seconds) ? String(seconds) : seconds.toFixed(3);
}
