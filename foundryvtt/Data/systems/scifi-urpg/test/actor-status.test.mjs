import { test } from "node:test";
import assert from "node:assert/strict";

test("manual unconscious status changes use Foundry's overlay", async () => {
  const calls = [];
  globalThis.Actor = class {
    async toggleStatusEffect(...args) { calls.push(args); }
  };
  const { SciFiActor } = await import("../module/documents/actor.mjs");
  const actor = new SciFiActor();
  actor.type = "character";
  actor.statuses = new Set();

  await actor.toggleStatusEffect("unconscious", { active: true });

  assert.deepEqual(calls, [["unconscious", { active: true, overlay: true }]]);
});

test("other manual status changes keep Foundry's requested display", async () => {
  const calls = [];
  globalThis.Actor = class {
    async toggleStatusEffect(...args) { calls.push(args); }
  };
  const { SciFiActor } = await import("../module/documents/actor.mjs?other-status");
  const actor = new SciFiActor();
  actor.type = "character";

  await actor.toggleStatusEffect("stunned", { active: true });

  assert.deepEqual(calls, [["stunned", { active: true }]]);
});
