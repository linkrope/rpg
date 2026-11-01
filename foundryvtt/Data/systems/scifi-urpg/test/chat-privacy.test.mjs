import { test } from "node:test";
import assert from "node:assert/strict";

test("a GM NPC roll redacts its formula when the chat mode is Public as Character", async () => {
  const messages = [];
  globalThis.foundry = {
    utils: { escapeHTML: (value) => String(value) },
    documents: {
      ChatMessage: {
        implementation: {
          applyMode: (message) => ({ ...message, whisper: [], blind: false, style: "ic" })
        }
      }
    }
  };
  globalThis.game = {
    settings: { get: () => "ic" },
    user: { id: "gm", isGM: true },
    users: [{ id: "gm", isGM: true }]
  };
  globalThis.ChatMessage = { create: async (message) => messages.push(message) };

  const { postRollCard } = await import(`../module/chat.mjs?ic-privacy-test=${Date.now()}`);
  await postRollCard(
    { id: "npc", hasPlayerOwner: false },
    {
      speaker: { actor: "npc" },
      content: "<div class=\"roll-formula\">17 (skill) + (2 - 0) (n5)</div><div class=\"roll-result\">19</div>",
      publicContent: "<div class=\"roll-result\">19</div>",
      result: 19
    }
  );

  assert.equal(messages.length, 2);
  assert.doesNotMatch(messages[0].content, /roll-formula|17 \(skill\)/);
  assert.match(messages[0].content, /roll-result/);
  assert.match(messages[1].content, /roll-formula|17 \(skill\)/);
  assert.deepEqual(messages[1].whisper, ["gm"]);
});
