import { test } from "node:test";
import assert from "node:assert/strict";

test("ship weapon migration renames legacy damage to BEP", async () => {
  globalThis.foundry = {
    abstract: { TypeDataModel: class { static migrateData(source) { return source; } } },
    data: { fields: {} },
  };
  const { ShipWeaponDataModel } = await import(`../module/data/ship-data.mjs?test=${Date.now()}`);
  const source = { damage: 8, accuracy: 2 };

  assert.deepEqual(ShipWeaponDataModel.migrateData(source), { bep: 8, accuracy: 2 });
});
