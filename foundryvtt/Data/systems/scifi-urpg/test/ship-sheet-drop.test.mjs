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

test("crew skill rolls use the assigned crew's current combined role value", async () => {
  const originalRandom = Math.random;
  Math.random = () => 0; // p5 rolls a 1, so n5 is 0.

  globalThis.foundry = { utils: { escapeHTML: (value) => String(value) } };
  globalThis.game = {
    actors: new Map([
      ["gunner-1", { id: "gunner-1", type: "character", name: "Ari", system: { skills: { Eingebettete: { value: 10 } }, health: { damage: 0 } } }],
      ["gunner-2", { id: "gunner-2", type: "character", name: "Bea", system: { skills: { Eingebettete: { value: 10 } }, health: { damage: 0 } } }],
    ]),
    settings: { get: () => "public" },
    user: { isGM: false },
  };
  const messages = [];
  globalThis.ChatMessage = {
    getSpeaker: () => ({ alias: "ship" }),
    create: async (message) => { messages.push(message); },
  };

  try {
    const { SciFiShipSheet } = await import(`../module/sheets/ship-sheet.mjs?test=${Date.now()}`);
    const sheet = Object.create(SciFiShipSheet.prototype);
    sheet.actor = {
      id: "ship-1",
      name: "Odyssey",
      hasPlayerOwner: true,
      system: { crew: { members: [
        { actorId: "gunner-1", pilot: false, gunner: true },
        { actorId: "gunner-2", pilot: false, gunner: true },
      ] } },
    };
    sheet.submit = async () => {};

    await sheet._onRollCrewSkill({
      preventDefault: () => {},
      currentTarget: { dataset: { crewRole: "gunner" } },
    });

    assert.equal(messages.length, 1);
    assert.match(messages[0].content, /<h3>Eingebettete<\/h3>/);
    assert.match(messages[0].content, /15 \+ \(0 - 0\) \(n5\)/);
    assert.match(messages[0].content, /<div class="roll-result">15<\/div>/);
  } finally {
    Math.random = originalRandom;
  }
});
