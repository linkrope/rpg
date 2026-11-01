import { test } from "node:test";
import assert from "node:assert/strict";

test("ship design display rounds floating-point free tonnage to three decimals", async () => {
  globalThis.ActorSheet = class { async getData() { return {}; } };
  globalThis.game = { actors: new Map() };
  const { SciFiShipSheet } = await import(`../module/sheets/ship-sheet.mjs?test=${Date.now()}`);
  const sheet = Object.create(SciFiShipSheet.prototype);
  sheet.actor = {
    system: {
      design: { mode: "standard", baseMark: "I", length: 40, tonnageOverride: null },
      crew: { members: [] }, weapon: {}, movement: { velocityX: 0, velocityY: 0 },
    },
    items: [],
  };

  const context = await sheet.getData();

  assert.equal(context.specificationDisplay.freeTonnage, "1.712");
});
