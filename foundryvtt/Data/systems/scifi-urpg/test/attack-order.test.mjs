import { test } from "node:test";
import assert from "node:assert/strict";

test("a character-sheet attack posts its card before the resulting Shock card", async () => {
  globalThis.ActorSheet = class { constructor(actor) { this.actor = actor; } };
  globalThis.Application = class {};
  globalThis.foundry = { utils: { escapeHTML: (value) => String(value) } };
  const cards = [];
  globalThis.ChatMessage = {
    getSpeaker: () => ({}),
    create: async (data) => { cards.push(data.content.includes("attack-card") ? "Attack" : "Shock"); }
  };
  const weapon = { type: "weapon", name: "Test", system: { rangeModifier: 0, skill: "Test", bep: 1 } };
  const attacker = { id: "attacker", name: "Attacker", hasPlayerOwner: true, system: { weapon: { selected: "w" }, skills: { Test: { value: 20 } }, health: {} }, items: new Map([["w", weapon]]) };
  const target = { id: "target", name: "Target", type: "character", system: { health: {}, armor: {} } };
  const targetToken = { actor: target, center: { x: 100, y: 0 }, document: { elevation: 0 } };
  globalThis.canvas = { scene: { grid: { size: 100, distance: 1 } }, tokens: { controlled: [{ actor: attacker, center: { x: 0, y: 0 }, document: { elevation: 0 } }] } };
  globalThis.game = {
    user: { isGM: true, targets: new Set([targetToken]) },
    settings: { get: () => "public" },
    scifiUrpg: {
      updateActor: async (_actor, _update, { beforeApply, shockDamageTotal }) => {
        await beforeApply?.(null);
        if (shockDamageTotal !== null) cards.push("Shock");
        return null;
      }
    }
  };
  const originalRandom = Math.random;
  try {
    Math.random = () => 0;
    const { SciFiCharacterSheet } = await import("../module/sheets/character-sheet.mjs");
    await new SciFiCharacterSheet(attacker).attackTarget();
    assert.deepEqual(cards, ["Attack", "Shock"]);
  } finally {
    Math.random = originalRandom;
  }
});
