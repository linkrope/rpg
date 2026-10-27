import { test } from "node:test";
import assert from "node:assert/strict";

test("combat initiative rolls send each formula only to its owner and the GM", async () => {
  globalThis.Combat = class {
    async updateEmbeddedDocuments(...args) { this.updates = args; }
  };
  globalThis.foundry = {
    utils: {
      escapeHTML: (value) => String(value),
      mergeObject: (original, other) => ({ ...original, ...other })
    },
    documents: { ChatMessage: { implementation: { getSpeaker: () => ({}) } } }
  };
  const messages = [];
  globalThis.ChatMessage = { create: async (message) => messages.push(message) };
  const gm = { id: "gm", isGM: true };
  const pilot = { id: "pilot-user", isGM: false };
  const scout = { id: "scout-user", isGM: false };
  globalThis.game = {
    users: [gm, pilot, scout],
    user: gm,
    settings: { get: () => "public" }
  };
  const actorFor = (id, owner) => ({
    id,
    name: id,
    system: { skills: { Initiative: { value: 20 } }, health: {} },
    hasPlayerOwner: true,
    testUserPermission: (user) => user.id === owner.id
  });
  const combatants = new Map([
    ["pilot", { id: "pilot", actor: actorFor("pilot", pilot), isOwner: true }],
    ["scout", { id: "scout", actor: actorFor("scout", scout), isOwner: true }]
  ]);
  const { SciFiCombat } = await import("../module/documents/combat.mjs?initiative-privacy");
  const combat = new SciFiCombat();
  combat.combatants = combatants;

  const originalRandom = Math.random;
  try {
    Math.random = () => 0;
    await combat.rollInitiative(["pilot", "scout"]);
  } finally {
    Math.random = originalRandom;
  }

  assert.deepEqual(messages.map((message) => message.whisper), [
    ["gm", "pilot-user"],
    ["gm", "scout-user"]
  ]);
  assert.equal(messages[0].content.includes("20 (skill)"), true);
  assert.equal(messages[1].content.includes("20 (skill)"), true);

  messages.length = 0;
  await combat.rollInitiative("pilot");
  assert.deepEqual(messages.map((message) => message.whisper), [["gm", "pilot-user"]]);
});
