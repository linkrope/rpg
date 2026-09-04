import { SCI_FI } from "./module/constants.mjs";
import { SciFiActor } from "./module/documents/actor.mjs";
import { SciFiCombat } from "./module/documents/combat.mjs";
import { SciFiItem } from "./module/documents/item.mjs";
import { CharacterDataModel, GenericItemDataModel } from "./module/data/character-data.mjs";
import { SciFiDimensionsApp } from "./module/apps/dimensions-app.mjs";
import { SciFiCharacterSheet } from "./module/sheets/character-sheet.mjs";

Hooks.once("init", () => {
  CONFIG.SCI_FI = SCI_FI;

  CONFIG.Actor.documentClass = SciFiActor;
  CONFIG.Combat.documentClass = SciFiCombat;
  CONFIG.Combat.initiative.decimals = 3;
  CONFIG.Item.documentClass = SciFiItem;

  CONFIG.Actor.dataModels = {
    character: CharacterDataModel
  };

  CONFIG.Item.dataModels = {
    item: GenericItemDataModel
  };

  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("scifi-urpg", SciFiCharacterSheet, {
    types: ["character"],
    makeDefault: true,
    label: "SCI_FI.Sheets.Character"
  });
});

Hooks.once("ready", () => {
  game.scifiUrpg = game.scifiUrpg ?? {};
  game.scifiUrpg.dimensions = SciFiDimensionsApp;

  if (game.user?.isGM) void clearSecondaryTokenBars();
});

Hooks.on("createChatMessage", (message) => {
  const content = String(message.content ?? "");
  const rollMatch = content.match(/data-scifi-urpg-roll-result="(-?\d+)"/);
  const actorMatch = content.match(/data-scifi-urpg-actor-id="([^"]+)"/);
  if (!rollMatch || !actorMatch) return;

  const actor = game.actors?.get(actorMatch[1]);
  if (!actor) return;

  SciFiDimensionsApp.setLatestForActor(actor, Number(rollMatch[1]));
});

async function clearSecondaryTokenBars() {
  const staleAttribute = "skillPoints.Speziell";

  for (const actor of game.actors ?? []) {
    if (actor.type !== "character") continue;
    if (actor.prototypeToken?.bar2?.attribute !== staleAttribute) continue;

    await actor.update({ "prototypeToken.bar2.attribute": null });
  }

  for (const scene of game.scenes ?? []) {
    const updates = scene.tokens
      .filter((token) => token.actor?.type === "character" && token.bar2?.attribute === staleAttribute)
      .map((token) => ({
        _id: token.id,
        "bar2.attribute": null
      }));

    if (updates.length) await scene.updateEmbeddedDocuments("Token", updates);
  }
}
