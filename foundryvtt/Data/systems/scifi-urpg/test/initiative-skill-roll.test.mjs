import { test } from "node:test";
import assert from "node:assert/strict";

test("character-sheet Initiative rolls combine selected actors without creating combatants", async () => {
  globalThis.ActorSheet = class {
    constructor(actor) { this.actor = actor; }
  };
  globalThis.Application = class {};
  globalThis.foundry = { utils: { escapeHTML: (value) => String(value) } };
  const actor = {
    id: "pilot",
    name: "Pilot",
    system: { skills: { Initiative: { value: 20 } }, health: {} },
    rollInitiative: async () => { throw new Error("Character-sheet Initiative must not create a combatant"); }
  };
  const ally = {
    id: "copilot",
    type: "character",
    name: "Co-pilot",
    system: { skills: { Initiative: { value: 20 } }, health: {} }
  };
  globalThis.game = { user: { targets: new Set([{ actor: ally }]) } };

  const { SciFiCharacterSheet } = await import("../module/sheets/character-sheet.mjs?initiative-skill-roll");
  const sheet = new SciFiCharacterSheet(actor);
  const cards = [];
  sheet._postChatMessage = async (card) => cards.push(card);

  const originalRandom = Math.random;
  try {
    Math.random = () => 0;
    await sheet.rollSkill("Initiative");
  } finally {
    Math.random = originalRandom;
  }

  assert.deepEqual(cards, [{
    title: "Initiative",
    subtitle: "Pilot, Co-pilot",
    formula: "25 + 0 - 0",
    result: 25
  }]);
});
