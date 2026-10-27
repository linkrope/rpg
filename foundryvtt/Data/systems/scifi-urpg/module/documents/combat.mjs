import { rollN5 } from "../rules/dice.mjs";
import { formatDimensionSeconds, initiativeSecondsForDimension } from "../rules/dimensions.mjs";
import { skillRollTotal } from "../rules/skills.mjs";
import { actorNameElement, postRollCard } from "../chat.mjs";

export class SciFiCombat extends Combat {
  async rollInitiative(ids, { formula = null, updateTurn = true, messageMode, messageOptions = {} } = {}) {
    ids = typeof ids === "string" ? [ids] : ids;

    if ("rollMode" in messageOptions) {
      foundry.utils.logCompatibilityWarning(
        "The rollMode option of Combat#rollInitiative messageOptions is deprecated in favor of the `messageMode` option, a string key of CONFIG.ChatMessage.modes",
        { since: 14, until: 16 }
      );
      messageMode = foundry.dice.Roll._mapLegacyRollMode(messageOptions.rollMode);
      delete messageOptions.rollMode;
    }

    const updates = [];
    for (const [i, id] of ids.entries()) {
      const combatant = this.combatants.get(id);
      if (!combatant?.isOwner) continue;

      const initiative = rollSciFiInitiative(combatant);
      updates.push({ _id: id, initiative: initiative.seconds });

      const messageData = foundry.utils.mergeObject({
        speaker: foundry.documents.ChatMessage.implementation.getSpeaker({
          actor: combatant.actor,
          token: combatant.token,
          alias: combatant.name
        }),
        content: initiativeCard(combatant, initiative),
        flags: {
          "core.initiativeRoll": true,
          "scifi-urpg.initiative": initiative
        }
      }, messageOptions);

      const extraMessageOptions = { ...messageOptions };
      delete extraMessageOptions.flags;
      if (i > 0) extraMessageOptions.sound = null;

      await postRollCard(combatant.actor, {
        speaker: messageData.speaker,
        content: initiativeCard(combatant, initiative),
        publicContent: publicInitiativeCard(combatant, initiative),
        result: initiative.result,
        flags: messageData.flags,
        messageMode: messageMode ?? (combatant.hidden ? "gm" : null),
        messageOptions: extraMessageOptions,
        // Combat Initiative formulas are private. The GM receives every card;
        // each player receives only cards for actors they own.
        whisperRecipients: initiativeRecipients(combatant.actor)
      });
    }

    if (!updates.length) return this;

    const updateOptions = { turnEvents: false };
    if (!updateTurn) updateOptions.combatTurn = this.turn;
    await this.updateEmbeddedDocuments("Combatant", updates, updateOptions);

    return this;
  }

  _sortCombatants(a, b) {
    const ia = Number.isNumeric(a.initiative) ? a.initiative : Infinity;
    const ib = Number.isNumeric(b.initiative) ? b.initiative : Infinity;
    if (ia !== ib) return ia < ib ? -1 : 1;
    return a.id > b.id ? 1 : -1;
  }
}

function initiativeRecipients(actor) {
  return (game.users?.filter((user) => user.isGM || actor.testUserPermission?.(user, "OWNER")) ?? [])
    .map((user) => user.id);
}

function rollSciFiInitiative(combatant) {
  const skill = Number(combatant.actor?.system?.skills?.Initiative?.value ?? 0);
  const damage = Math.max(0, Number(combatant.actor?.system?.health?.damage ?? 0));
  const roll = rollN5();
  const result = skillRollTotal(skill, damage, roll.total);
  const seconds = initiativeSecondsForDimension(result);

  return {
    skill,
    damage,
    roll,
    result,
    seconds,
    time: formatDimensionSeconds(seconds)
  };
}

function initiativeCard(combatant, initiative) {
  const name = actorNameElement(combatant.actor);
  const formula = initiativeFormula(initiative);
  const actorId = foundry.utils.escapeHTML(combatant.actor?.id ?? "");

  return `
    <div class="scifi-urpg-chat-card initiative-card" data-scifi-urpg-roll-result="${Number(initiative.result)}" data-scifi-urpg-actor-id="${actorId}">
      <h3>Initiative</h3>
      <p>${name}</p>
      <div class="roll-formula">${foundry.utils.escapeHTML(formula)}</div>
      <div class="initiative-result-row">
        <div class="roll-result">${initiative.result}</div>
        <div class="reaction-time-box">
          <strong>${initiative.time} s</strong>
        </div>
      </div>
    </div>
  `;
}

function publicInitiativeCard(combatant, initiative) {
  const name = actorNameElement(combatant.actor);
  const actorId = foundry.utils.escapeHTML(combatant.actor?.id ?? "");

  return `
    <div class="scifi-urpg-chat-card initiative-card" data-scifi-urpg-roll-result="${Number(initiative.result)}" data-scifi-urpg-actor-id="${actorId}">
      <h3>Initiative</h3>
      <p>${name}</p>
      <div class="initiative-result-row">
        <div class="roll-result">${initiative.result}</div>
        <div class="reaction-time-box">
          <strong>${initiative.time} s</strong>
        </div>
      </div>
    </div>
  `;
}

function initiativeFormula(initiative) {
  const parts = [`${initiative.skill} (skill)`];

  if (initiative.damage > 0) parts.push(`- ${initiative.damage} (damage)`);

  parts.push(`+ ${initiative.roll.plus}`);
  parts.push(`- ${initiative.roll.minus}`);

  return parts.join(" ");
}
