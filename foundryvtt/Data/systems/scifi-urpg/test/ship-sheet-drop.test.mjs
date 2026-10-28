import { test } from "node:test";
import assert from "node:assert/strict";

test("a crew-tab actor drop is accepted when Foundry delivers it to the sheet root", async () => {
  globalThis.ActorSheet = class {
    async _onDrop() { throw new Error("drop was delegated instead of assigned to crew"); }
  };
  globalThis.TextEditor = { getDragEventData: () => ({ type: "Actor", id: "gunner-1" }) };
  globalThis.game = {
    actors: new Map([["gunner-1", { id: "gunner-1", type: "character" }]]),
  };

  const { SciFiShipSheet } = await import(`../module/sheets/ship-sheet.mjs?test=${Date.now()}`);
  let updateData;
  const sheet = Object.create(SciFiShipSheet.prototype);
  sheet.actor = {
    system: { crew: { members: [] } },
    update: async (data) => { updateData = data; },
  };
  sheet.element = { find: () => [{ dataset: { tab: "crew" } }] };
  const event = { target: { closest: () => null } };

  await sheet._onDrop(event);

  assert.deepEqual(updateData, {
    "system.crew.members": [{ actorId: "gunner-1", pilot: false, gunner: false }],
  });
});

test("crew role checkboxes update one physical crew-member row", async () => {
  const { SciFiShipSheet } = await import(`../module/sheets/ship-sheet.mjs?test=${Date.now()}`);
  let updateData;
  const sheet = Object.create(SciFiShipSheet.prototype);
  sheet.actor = {
    system: { crew: { members: [
      { actorId: "crew-1", pilot: false, gunner: false },
      { actorId: "crew-1", pilot: false, gunner: false },
    ] } },
    update: async (data) => { updateData = data; },
  };

  await sheet._onToggleCrewRole({
    currentTarget: { dataset: { crewIndex: "1", crewRole: "pilot" }, checked: true },
  });

  assert.deepEqual(updateData, {
    "system.crew.members": [
      { actorId: "crew-1", pilot: false, gunner: false },
      { actorId: "crew-1", pilot: true, gunner: false },
    ],
  });
});
