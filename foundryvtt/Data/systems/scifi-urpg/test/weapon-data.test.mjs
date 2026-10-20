import { test } from "node:test";
import assert from "node:assert/strict";

test("weapon migration replaces legacy range and rate with a neutral range modifier", async () => {
  globalThis.foundry = {
    abstract: {
      TypeDataModel: class {
        static migrateData(source) { return source; }
      }
    },
    data: { fields: {} }
  };
  const { WeaponDataModel } = await import(`../module/data/character-data.mjs?test=${Date.now()}`);
  const source = { range: 40, rate: 2, nozzle: "600m/s", clip: 30 };

  assert.deepEqual(WeaponDataModel.migrateData(source), {
    rangeModifier: 0,
    nozzle: "600m/s",
    clip: 30
  });
});

test("weapon migration preserves an already configured range modifier", async () => {
  const { WeaponDataModel } = await import(`../module/data/character-data.mjs?test=preserve-${Date.now()}`);
  const source = { range: 20, rate: 4, rangeModifier: -3 };

  assert.deepEqual(WeaponDataModel.migrateData(source), { rangeModifier: -3 });
});
