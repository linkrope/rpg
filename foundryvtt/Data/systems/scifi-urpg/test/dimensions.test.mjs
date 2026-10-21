import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDimensionRows } from "../module/rules/dimensions.mjs";

function dimensionsAt(value) {
  return Object.fromEntries(buildDimensionRows(value).map(({ label, value: rowValue }) => [label, rowValue]));
}

test("dimensions use the calculator's categories and baseline formulas", () => {
  const rows = dimensionsAt(0);

  assert.deepEqual(Object.keys(rows), [
    "Accuracy", "Healing", "Initiative", "Move", "Time/Speed", "Yield", "Range", "Accident"
  ]);
  assert.deepEqual(rows, {
    Accuracy: "0 % – ∞ %",
    Healing: "1 day/pt",
    Initiative: "4 s",
    Move: "2.500 m/s = 9 km/h",
    "Time/Speed": "100 %",
    Yield: "1",
    Range: "5 m",
    Accident: "0 %"
  });
});

test("dimensions calculate Accuracy, range, and accident according to the calculator", () => {
  assert.deepEqual(dimensionsAt(-20), {
    Accuracy: "0 % – ∞ %",
    Healing: "4 day/pt",
    Initiative: "16 s",
    Move: "1.250 m/s = 4.5 km/h",
    "Time/Speed": "400 %",
    Yield: "0.25",
    Range: "50 m",
    Accident: "40 %"
  });
});

test("dimensions use the calculator's finite Accuracy ceiling above zero", () => {
  assert.equal(dimensionsAt(20).Accuracy, "75 % – 133 %");
});

test("dimensions use the calculator's Move rounding", () => {
  assert.equal(dimensionsAt(-50).Move, "0.500 m/s = 1.625 km/h");
});
