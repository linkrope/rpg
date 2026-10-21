/**
 * Post a roll card without revealing an NPC's statistics to players.
 *
 * NPC rolls made by a GM produce a result-only card for players and a full
 * card whispered to GMs. Non-public Foundry message modes are applied as-is.
 */
export async function postRollCard(actor, {
  speaker,
  content,
  publicContent = null,
  privateContent = null,
  result,
  flags,
  actorIds = [],
  messageMode = null,
  messageOptions = {},
  whisperRecipients = null
} = {}) {
  // Hide NPC Names replaces every matching text node in a message whose speaker
  // is the NPC. That corrupts rolls when an NPC is named "5", for example.
  // Keep the actor out of the speaker data and let the card renderer resolve
  // actor-name elements for each viewer instead.
  const rollSpeaker = safeRollSpeaker(actor, speaker);
  const messageData = {
    ...messageOptions,
    speaker: rollSpeaker,
    content,
    flags: rollCardFlags(actor, flags, {}, actorIds)
  };

  if (whisperRecipients) {
    await ChatMessage.create({ ...messageData, whisper: whisperRecipients });
    return;
  }

  const resolvedMessageMode = messageMode ?? selectedMessageMode();
  if (resolvedMessageMode !== "public") {
    await ChatMessage.create(
      foundry.documents.ChatMessage.implementation.applyMode(messageData, resolvedMessageMode)
    );
    return;
  }

  if (!shouldRedactNpcRoll(actor)) {
    await ChatMessage.create(messageData);
    return;
  }

  await ChatMessage.create({
    ...messageOptions,
    speaker: rollSpeaker,
    content: publicContent ?? resultOnlyCard(actor, result),
    flags: rollCardFlags(actor, flags, { publicNpcResult: true }, actorIds)
  });

  await ChatMessage.create({
    ...messageOptions,
    speaker: rollSpeaker,
    content: privateContent ?? content,
    whisper: game.users.filter((user) => user.isGM).map((user) => user.id),
    flags: rollCardFlags(actor, flags, {}, actorIds),
    sound: null
  });
}

/**
 * Return markup whose name is resolved at render time for the current user.
 * The unrendered name is deliberately isolated from roll values and formulas.
 */
export function actorNameElement(actor) {
  const actorId = foundry.utils.escapeHTML(actor?.id ?? "");
  const name = foundry.utils.escapeHTML(actor?.name ?? "");
  return `<span class="scifi-urpg-actor-name" data-scifi-urpg-actor-name="${actorId}">${name}</span>`;
}

function selectedMessageMode() {
  const messageMode = game.settings.get("core", "messageMode");
  if (messageMode) return messageMode;

  const legacyMode = game.settings.get("core", "rollMode");
  return foundry.dice.Roll._mapLegacyRollMode(legacyMode) ?? "public";
}

function safeRollSpeaker(actor, speaker) {
  if (actor?.hasPlayerOwner || typeof game.hnn?.getReplacementInfo !== "function") return speaker;

  // An alias-only speaker makes Hide NPC Names skip its document-wide text
  // replacement while retaining a useful chat header for this system to render.
  return { alias: actor.name };
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
