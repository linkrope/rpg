import { SCI_FI, displaySkillName, fmtArmor } from "./module/constants.mjs";
import { SciFiActor } from "./module/documents/actor.mjs";
import { SciFiCombat } from "./module/documents/combat.mjs";
import { SciFiItem } from "./module/documents/item.mjs";
import { CharacterDataModel, GenericItemDataModel } from "./module/data/character-data.mjs";
import { SciFiDimensionsApp } from "./module/apps/dimensions-app.mjs";
import { SciFiCharacterSheet } from "./module/sheets/character-sheet.mjs";
import { rollN5, rollP5 } from "./module/rules/dice.mjs";
import { combineSkillValues } from "./module/rules/skills.mjs";
import { DEFAULT_AIM_ZONES, resolveAttack, weaponPresetFor } from "./module/rules/combat.mjs";

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
  game.scifiUrpg.updateActor = updateActor;
  game.scifiUrpg.macros = {
    attack,
    openDimensions,
    repairArmor,
    rollN5: rollN5Macro,
    rollP5: rollP5Macro,
    rollSkill
  };

  if (game.user?.isGM) void clearSecondaryTokenBars();
});

Hooks.once("ready", () => {
  game.socket.on("system.scifi-urpg", handleSystemSocket);
});

Hooks.on("createChatMessage", (message) => {
  const content = String(message.content ?? "");
  const rollMatch = content.match(/data-scifi-urpg-roll-result="(-?\d+)"/);
  const actorMatch = content.match(/data-scifi-urpg-actor-id="([^"]+)"/);

  if (rollMatch && actorMatch) {
    const actor = game.actors?.get(actorMatch[1]);
    if (actor) SciFiDimensionsApp.setLatestForActor(actor, Number(rollMatch[1]));
  }

  void applyChatTargetUpdate(message);
});

Hooks.on("hotbarDrop", (bar, data, slot) => {
  if (data?.type !== "scifi-urpg.roll") return;

  void createRollMacro(data, slot);
  return false;
});

async function createRollMacro(data, slot) {
  const actor = game.actors?.get(data.actorId);
  if (!actor) {
    ui.notifications.warn("Could not create SciFi macro: actor not found.");
    return;
  }

  const macroData = buildRollMacroData(actor, data);
  if (!macroData) return;

  const existing = game.macros?.find((macro) =>
    macro.name === macroData.name
    && macro.command === macroData.command
    && macro.author?.id === game.user.id
  );
  const macro = existing ?? await Macro.create(macroData);

  await game.user.assignHotbarMacro(macro, slot);
}

function buildRollMacroData(actor, data) {
  const actorId = JSON.stringify(actor.id);
  const attackOptions = {
    actorId: actor.id,
    bonus: numberOrZero(data.bonus),
    aimZones: Array.isArray(data.aimZones) && data.aimZones.length ? data.aimZones : DEFAULT_AIM_ZONES
  };
  const action = {
    attack: {
      name: "Attack",
      command: `await game.scifiUrpg.macros.attack(${JSON.stringify(attackOptions)});`
    },
    dimensions: {
      name: "Dimensions",
      command: `game.scifiUrpg.macros.openDimensions({ actorId: ${actorId} });`
    },
    n5: {
      name: "n5",
      command: `await game.scifiUrpg.macros.rollN5({ actorId: ${actorId} });`
    },
    p5: {
      name: "p5",
      command: `await game.scifiUrpg.macros.rollP5({ actorId: ${actorId} });`
    },
    repairArmor: {
      name: "Repair Armor",
      command: `await game.scifiUrpg.macros.repairArmor({ actorId: ${actorId} });`
    }
  }[data.action];

  if (data.action === "skill" && data.skillKey) {
    const skillKey = JSON.stringify(data.skillKey);
    const skillName = displaySkillName(data.skillKey);
    return macroData(actor, skillName, `await game.scifiUrpg.macros.rollSkill({ actorId: ${actorId}, skillKey: ${skillKey} });`);
  }

  if (!action) return null;
  return macroData(actor, action.name, action.command);
}

function macroData(actor, name, command) {
  return {
    name,
    type: "script",
    img: actor.img,
    command
  };
}

async function rollP5Macro({ actorId } = {}) {
  const actor = actorForMacro(actorId);
  if (!actor) return;

  const roll = rollP5();
  await postRollMessage(actor, {
    title: "p5",
    formula: "p5",
    result: roll.total
  });
}

async function rollN5Macro({ actorId } = {}) {
  const actor = actorForMacro(actorId);
  if (!actor) return;

  const roll = rollN5();
  await postRollMessage(actor, {
    title: "n5",
    formula: `${roll.plus} - ${roll.minus}`,
    result: roll.total
  });
}

async function rollSkill({ actorId, skillKey } = {}) {
  const actor = actorForMacro(actorId);
  if (!actor || !skillKey) return;

  if (skillKey === "Initiative") {
    await actor.rollInitiative({ createCombatants: true, rerollInitiative: true });
    return;
  }

  const selected = rollParticipants(actor)
    .map((participant) => skillContribution(participant, skillKey))
    .filter(Boolean);

  if (!selected.length) {
    ui.notifications.warn(`No ${displaySkillName(skillKey)} skill found for this SciFi roll.`);
    return;
  }

  const base = combineSkillValues(selected.map((skill) => skill.adjustedValue));
  const roll = rollN5();
  const total = base + roll.total;

  await postRollMessage(actor, {
    title: rollTitle(selected),
    subtitle: rollSources(selected),
    base,
    plus: roll.plus,
    minus: roll.minus,
    result: total
  });
}

async function attack({ actorId, bonus = 0, aimZones = DEFAULT_AIM_ZONES } = {}) {
  const actor = actorForMacro(actorId);
  if (!actor) return;

  if (game.user.targets.size !== 1) {
    ui.notifications.warn("Target exactly one token before attacking.");
    return;
  }

  const targetToken = Array.from(game.user.targets)[0];
  const target = targetToken.actor;
  if (!target || target.type !== "character") {
    ui.notifications.warn("The targeted token must be a SciFi character actor.");
    return;
  }

  const weapon = weaponPresetFor(actor.system.weapon?.selected);
  const skillKey = actor.system.skills?.[weapon.skill] ? weapon.skill : "Waffenlos";
  const distance = distanceToTarget(actor, targetToken);
  if (distance === null) {
    ui.notifications.warn("Place this actor on the scene before attacking.");
    return;
  }

  const meleeReach = Math.max(1, Number(canvas.scene?.grid?.distance ?? 1) || 1);
  if (!weapon.range && distance > meleeReach) {
    ui.notifications.warn(`${weapon.name} is a melee weapon. Move within ${meleeReach} ${canvas.scene?.grid?.units || "grid unit"} before attacking.`);
    return;
  }

  const outcome = resolveAttack({
    attacker: actor,
    target,
    skillKey,
    bonus,
    distance,
    aimZones
  });

  const updateRequest = await updateActor(target, outcome.updateData, { token: targetToken });

  await postAttackMessage(actor, outcome, { updateRequest });
}

function openDimensions({ actorId } = {}) {
  const actor = actorForMacro(actorId);
  if (actor) SciFiDimensionsApp.openForActor(actor);
}

async function repairArmor({ actorId } = {}) {
  const actor = actorForMacro(actorId);
  if (!actor) return;

  const updateData = {};
  for (const [zone, armor] of Object.entries(actor.system.armor ?? {})) {
    updateData[`system.armor.${zone}.battered`] = numberOrZero(armor.value);
  }

  if (!Object.keys(updateData).length) return;

  await actor.update(updateData);
  ui.notifications.info(`${actor.name}'s armor has been repaired.`);
}

async function updateActor(actor, updateData, { token = null } = {}) {
  if (!actor || !Object.keys(updateData ?? {}).length) return null;

  if (canUpdateActor(actor)) {
    await actor.update(updateData);
    return null;
  }

  const activeGMs = activeGMUsers();
  if (!activeGMs.length) {
    ui.notifications.warn("Cannot apply target damage: no active GM is available.");
    return null;
  }

  const request = {
    actorId: actor.id,
    actorUuid: actor.uuid,
    tokenUuid: token?.document?.uuid ?? token?.uuid ?? null,
    updateData,
    requesterId: game.user.id
  };

  game.socket.emit("system.scifi-urpg", {
    type: "updateActor",
    ...request
  });
  ui.notifications.info(`Sent ${actor.name} damage update to ${activeGMs.length} active GM client${activeGMs.length === 1 ? "" : "s"}.`);
  return request;
}

function canUpdateActor(actor) {
  if (typeof actor.canUserModify === "function") {
    return actor.canUserModify(game.user, "update");
  }

  return game.user.isGM || actor.testUserPermission?.(game.user, "OWNER");
}

async function handleSystemSocket(message) {
  if (!game.user?.isGM) return;
  if (message?.type !== "updateActor") return;

  await applyTargetUpdateRequest(message, "socket");
}

async function applyChatTargetUpdate(message) {
  if (!game.user?.isGM) return;

  const request = message.getFlag("scifi-urpg", "targetUpdate");
  if (!request) return;

  await applyTargetUpdateRequest(request, "chat");
}

async function applyTargetUpdateRequest(request, source) {
  const target = await resolveSocketUpdateTarget(request);
  if (!target?.actor) {
    console.warn(`SciFi@URPG | Could not resolve actor for ${source} update.`, request);
    return;
  }

  const updateData = sanitizeCombatUpdateData(request.updateData);
  if (!Object.keys(updateData).length) {
    console.warn(`SciFi@URPG | Ignored ${source} update without valid combat fields.`, request);
    return;
  }

  try {
    await target.actor.update(updateData);
    console.log(`SciFi@URPG | Applied ${source} actor update.`, {
      actor: target.actor.name,
      tokenUuid: target.tokenDocument?.uuid ?? null,
      updateData,
      requesterId: request.requesterId
    });
  } catch (error) {
    console.error(`SciFi@URPG | Could not apply ${source} actor update.`, error, request);
    ui.notifications.error(`Could not apply damage to ${target.actor.name}. See console for details.`);
  }
}

async function resolveSocketUpdateTarget(message) {
  const tokenDocument = message.tokenUuid ? await fromUuid(message.tokenUuid) : null;
  if (tokenDocument?.actor?.type === "character") {
    return { actor: tokenDocument.actor, tokenDocument };
  }

  const fromActorUuid = message.actorUuid ? await fromUuid(message.actorUuid) : null;
  if (fromActorUuid?.type === "character") return { actor: fromActorUuid, tokenDocument: null };

  const worldActor = game.actors?.get(message.actorId);
  if (worldActor?.type === "character") return { actor: worldActor, tokenDocument: null };

  return null;
}

function activeGMUsers() {
  return game.users
    ?.filter((user) => user.active && user.isGM)
    .sort((a, b) => a.id.localeCompare(b.id)) ?? [];
}

function sanitizeCombatUpdateData(updateData) {
  const allowed = [
    /^system\.health\.damage$/,
    /^system\.armor\.(torso|legs|arms|head)\.battered$/
  ];
  const sanitized = {};

  for (const [key, value] of Object.entries(flattenUpdateData(updateData))) {
    if (!allowed.some((pattern) => pattern.test(key))) continue;

    const number = Number(value);
    if (Number.isFinite(number)) sanitized[key] = Math.max(0, number);
  }

  return sanitized;
}

function flattenUpdateData(data, prefix = "") {
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};

  const flattened = {};
  for (const [key, value] of Object.entries(data)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(flattened, flattenUpdateData(value, path));
    } else {
      flattened[path] = value;
    }
  }

  return flattened;
}

function actorForMacro(actorId) {
  const actor = game.actors?.get(actorId);
  if (actor?.type === "character") return actor;

  ui.notifications.warn("SciFi actor not found.");
  return null;
}

function rollParticipants(actor) {
  const actorsById = new Map([[actor.id, actor]]);

  for (const token of game.user?.targets ?? []) {
    const targetActor = token.actor;
    if (targetActor?.type === "character") actorsById.set(targetActor.id, targetActor);
  }

  return Array.from(actorsById.values());
}

function skillContribution(actor, skillKey) {
  const skill = actor.system.skills?.[skillKey];
  if (!skill) return null;

  const value = numberOrZero(skill.value);
  const damage = Math.max(0, numberOrZero(actor.system.health?.damage));

  return {
    actorId: actor.id,
    actorName: actor.name,
    key: skillKey,
    adjustedValue: value - damage
  };
}

function rollSources(selected) {
  return uniqueStrings(selected.map((skill) => skill.actorName)).join(", ");
}

function rollTitle(selected) {
  return uniqueStrings(selected.map((skill) => skill.key)).join(" + ");
}

function uniqueStrings(values) {
  return values.filter((value, index) => values.indexOf(value) === index);
}

async function postRollMessage(actor, { title, subtitle = "", formula = "", base = null, plus = null, minus = null, result }) {
  const speaker = ChatMessage.getSpeaker({ actor });
  SciFiDimensionsApp.setLatestForActor(actor, result);
  const details = base === null
    ? `<div class="roll-formula">${foundry.utils.escapeHTML(formula)}</div>`
    : `<div class="roll-formula">${Number(base)} + ${Number(plus)} - ${Number(minus)}</div>`;

  const content = `
    <div class="scifi-urpg-chat-card" data-scifi-urpg-roll-result="${Number(result)}" data-scifi-urpg-actor-id="${foundry.utils.escapeHTML(actor.id)}">
      <h3>${foundry.utils.escapeHTML(title)}</h3>
      ${subtitle ? `<p>${foundry.utils.escapeHTML(subtitle)}</p>` : ""}
      ${details}
      <div class="roll-result">${result}</div>
    </div>
  `;

  await ChatMessage.create({
    speaker,
    content
  });
}

async function postAttackMessage(actor, outcome, { updateRequest = null } = {}) {
  const speaker = ChatMessage.getSpeaker({ actor });
  const escapedTarget = foundry.utils.escapeHTML(outcome.target.name);
  const escapedWeapon = foundry.utils.escapeHTML(outcome.weapon.name);
  const title = outcome.skillKey;
  const damageSection = outcome.hit ? attackResultSection({
    title: "Damage",
    formula: damageFormula(outcome),
    result: outcome.damage
  }) : "";
  const armorLossSection = outcome.armorLoss && outcome.armorBefore !== outcome.armorAfter ? attackResultSection({
    title: "Armor Loss",
    formula: armorLossFormula(outcome),
    result: fmtArmor(outcome.armorLoss.loss)
  }) : "";
  const downHtml = outcome.targetDown
    ? `<div class="attack-status-line">${escapedTarget} is down!</div>`
    : "";

  const content = `
    <div class="scifi-urpg-chat-card attack-card" data-scifi-urpg-roll-result="${Number(outcome.result)}" data-scifi-urpg-actor-id="${foundry.utils.escapeHTML(actor.id)}">
      <h3>${foundry.utils.escapeHTML(title)}</h3>
      <p>${foundry.utils.escapeHTML(actor.name)} attacks ${escapedTarget} with ${escapedWeapon}</p>
      <div class="roll-formula">${foundry.utils.escapeHTML(attackFormula(outcome))}</div>
      <div class="roll-result">${outcome.result}</div>
      ${damageSection}
      ${armorLossSection}
      ${downHtml}
    </div>
  `;

  const messageData = { speaker, content };
  if (updateRequest) {
    messageData.flags = {
      "scifi-urpg": {
        targetUpdate: updateRequest
      }
    };
  }

  await ChatMessage.create(messageData);
}

function attackFormula(outcome) {
  const parts = [`${outcome.skillVal} (skill)`];

  if (outcome.damagePen > 0) parts.push(`- ${outcome.damagePen} (damage)`);
  if (outcome.bonus > 0) parts.push(`+ ${outcome.bonus} (modifier)`);
  if (outcome.bonus < 0) parts.push(`- ${Math.abs(outcome.bonus)} (modifier)`);
  if (outcome.distPen > 0) parts.push(`- ${outcome.distPen} (distance ${outcome.distance})`);
  if (outcome.aimPen > 0) parts.push(`- ${outcome.aimPen} (aim)`);

  parts.push(`+ ${outcome.roll.plus}`);
  parts.push(`- ${outcome.roll.minus}`);

  return parts.join(" ");
}

function attackResultSection({ title, formula, result }) {
  return `
    <section class="attack-result-section">
      <h4>${foundry.utils.escapeHTML(title)}</h4>
      <div class="roll-formula">${foundry.utils.escapeHTML(formula)}</div>
      <div class="roll-result">${foundry.utils.escapeHTML(String(result))}</div>
    </section>
  `;
}

function damageFormula(outcome) {
  return `${outcome.result}/5 + ${outcome.weapon.bep} (weapon) - ${fmtArmor(outcome.armorBefore)} (${outcome.zone})`;
}

function armorLossFormula(outcome) {
  const { ruestungseffekt, trefferzonenPct, material, eaten } = outcome.armorLoss;
  return `${ruestungseffekt}% (effect) / ${trefferzonenPct}% (zone) x ${material.lossNum}/${material.lossDenom} (loss) x ${fmtArmor(eaten)} (damage)`;
}

function distanceToTarget(actor, targetToken) {
  const attackerToken = attackerTokenFor(actor);
  if (!attackerToken || !targetToken) return null;

  const attackerCenter = tokenCenter(attackerToken);
  const targetCenter = tokenCenter(targetToken);
  const measured = measureSceneDistance(attackerCenter, targetCenter);
  if (Number.isFinite(measured)) return Math.round(measured);

  const gridSize = Number(canvas.scene?.grid?.size ?? canvas.grid?.size ?? 100) || 100;
  const gridDistance = Number(canvas.scene?.grid?.distance ?? 1) || 1;
  const pixelDistance = Math.hypot(targetCenter.x - attackerCenter.x, targetCenter.y - attackerCenter.y);

  return Math.round((pixelDistance / gridSize) * gridDistance);
}

function attackerTokenFor(actor) {
  const controlled = canvas.tokens?.controlled?.find((token) => token.actor?.id === actor.id);
  if (controlled) return controlled;

  const activeTokens = actor.getActiveTokens?.(false, false) ?? [];
  return activeTokens[0] ?? null;
}

function tokenCenter(token) {
  if (token.center) return token.center;

  const document = token.document ?? token;
  const width = Number(document.width ?? 1) * (Number(canvas.scene?.grid?.size ?? canvas.grid?.size ?? 100) || 100);
  const height = Number(document.height ?? 1) * (Number(canvas.scene?.grid?.size ?? canvas.grid?.size ?? 100) || 100);
  return {
    x: Number(document.x ?? token.x ?? 0) + width / 2,
    y: Number(document.y ?? token.y ?? 0) + height / 2
  };
}

function measureSceneDistance(origin, destination) {
  try {
    if (typeof canvas.grid?.measurePath === "function") {
      const measurement = canvas.grid.measurePath([origin, destination], { gridSpaces: true });
      return Number(measurement?.distance ?? measurement?.distances?.[0]);
    }

    if (typeof canvas.grid?.measureDistance === "function") {
      return Number(canvas.grid.measureDistance(origin, destination, { gridSpaces: true }));
    }
  } catch (error) {
    console.warn("SciFi@URPG | Falling back to token center distance.", error);
  }

  return NaN;
}

function numberOrZero(value) {
  if (value === "" || value === "-") return 0;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

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
