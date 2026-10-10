/**
 * Post a roll card without revealing an NPC's statistics to players.
 *
 * NPC rolls made by a GM produce a result-only card for players and a full
 * card whispered to GMs. Non-public Foundry message modes are applied as-is.
 */
export async function postRollCard(actor, { speaker, content, publicContent = null, privateContent = null, result, flags, actorIds = [] } = {}) {
  const messageData = { speaker, content, flags: rollCardFlags(actor, flags, {}, actorIds) };

  const messageMode = selectedMessageMode();
  if (messageMode !== "public") {
    await ChatMessage.create(
      foundry.documents.ChatMessage.implementation.applyMode(messageData, messageMode)
    );
    return;
  }

  if (!shouldRedactNpcRoll(actor)) {
    await ChatMessage.create(messageData);
    return;
  }

  await ChatMessage.create({
    speaker,
    content: publicContent ?? resultOnlyCard(actor, result),
    flags: rollCardFlags(actor, flags, { publicNpcResult: true }, actorIds)
  });

  await ChatMessage.create({
    speaker,
    content: privateContent ?? content,
    whisper: game.users.filter((user) => user.isGM).map((user) => user.id),
    flags: rollCardFlags(actor, null, {}, actorIds)
  });
}

function selectedMessageMode() {
  const messageMode = game.settings.get("core", "messageMode");
  if (messageMode) return messageMode;

  const legacyMode = game.settings.get("core", "rollMode");
  return foundry.dice.Roll._mapLegacyRollMode(legacyMode) ?? "public";
}

function shouldRedactNpcRoll(actor) {
  return game.user?.isGM && !actor.hasPlayerOwner;
}

function resultOnlyCard(actor, result) {
  return `
    <div class="scifi-urpg-chat-card" data-scifi-urpg-roll-result="${Number(result)}" data-scifi-urpg-actor-id="${foundry.utils.escapeHTML(actor.id)}">
      <div class="roll-result">${Number(result)}</div>
    </div>
  `;
}

function rollCardFlags(actor, flags, additionalFlags = {}, actorIds = []) {
  return {
    ...(flags ?? {}),
    "scifi-urpg": {
      ...(flags?.["scifi-urpg"] ?? {}),
      rollCard: true,
      actorIds: [...new Set([actor?.id, ...actorIds].filter(Boolean))],
      ...additionalFlags
    }
  };
}
