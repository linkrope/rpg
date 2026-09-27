import { ARMOR_MATERIALS, ARMOR_ZONE_DEFS, BASE_HIT_ZONE_PCT, SKILL_COLUMN_BY_KEY, buildArmorMaterials, buildArmorZones, fmtArmor, buildSkillColumns, skillChangeCost, stepCostForLevel, WEAPON_OPTIONS } from "../constants.mjs";
import { SciFiDimensionsApp } from "../apps/dimensions-app.mjs";
import { rollN5, rollP5 } from "../rules/dice.mjs";
import { combineSkillValues } from "../rules/skills.mjs";
import { DEFAULT_AIM_ZONES, aimPenalty, aimTotalPct, resolveAttack, weaponPresetFor } from "../rules/combat.mjs";

function displayNumber(value) {
  return Number(value ?? 0) === 0 ? "-" : value;
}

function inputNumber(value) {
  return Number(value ?? 0) === 0 ? "" : value;
}

function armorNumber(value) {
  return numberOrZero(value) === 0 ? "" : fmtArmor(value ?? 0);
}

function displayArmor(value) {
  return numberOrZero(value) === 0 ? "-" : fmtArmor(value ?? 0);
}

function numberOrZero(value) {
  if (value === "" || value === "-") return 0;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

async function renderMarkdown(markdown, relativeTo) {
  const source = String(markdown ?? "");
  if (!source.trim()) return "";

  const converter = foundry.applications?.sheets?.journal?.JournalEntryPageMarkdownSheet?._converter
    ?? foundry.applications?.sheets?.journal?.JournalEntryPageTextSheet?._converter;
  const html = markdownToHtml(source, converter);
  const clean = foundry.utils.cleanHTML(html);
  const TextEditorClass = foundry.applications?.ux?.TextEditor?.implementation ?? globalThis.TextEditor;

  return TextEditorClass?.enrichHTML
    ? TextEditorClass.enrichHTML(clean, { async: true, relativeTo })
    : clean;
}

function markdownToHtml(markdown, converter) {
  if (converter?.makeHtml) return converter.makeHtml(markdown);
  if (globalThis.showdown?.Converter) return new globalThis.showdown.Converter().makeHtml(markdown);
  return fallbackMarkdownToHtml(markdown);
}

function fallbackMarkdownToHtml(markdown) {
  const escaped = foundry.utils.escapeHTML(String(markdown ?? ""));
  return escaped
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export class SciFiCharacterSheet extends ActorSheet {
  constructor(...args) {
    super(...args);
    this._pendingSkillIncreases = new Map();
    this._levelingUp = false;
    this._editingSkills = false;
    this._editingTalents = false;
    this._editingNotes = false;
    this._activeArmorZone = "torso";
    this._selectedSkillKeys = new Set();
    this._attackAimZones = new Set(DEFAULT_AIM_ZONES);
    this._attackBonus = 0;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["scifi-urpg", "sheet", "actor", "character"],
      template: "systems/scifi-urpg/templates/actor/character-sheet.hbs",
      width: 760,
      height: 760,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "skills" }]
    });
  }

  get template() {
    return "systems/scifi-urpg/templates/actor/character-sheet.hbs";
  }

  async getData(options = {}) {
    const context = await super.getData(options);
    const system = this.actor.system;
    const pendingAdvancement = Array.from(this._pendingSkillIncreases.values())
      .reduce((total, value) => total + value, 0);

    context.system = system;
    context.hasPendingAdvancement = pendingAdvancement > 0;
    context.playMode = !this._levelingUp && !this._editingSkills;
    context.levelingUp = this._levelingUp;
    context.editingSkills = this._editingSkills;
    context.editingTalents = this._editingTalents;
    context.editingNotes = this._editingNotes;
    context.activeArmorZone = this._buildActiveArmorZone(system.armor);
    context.armorZones = buildArmorZones(system.armor).map((zone) => ({
      ...zone,
      displayValue: displayArmor(zone.value),
      displayBattered: displayArmor(zone.battered),
      active: zone.key === context.activeArmorZone.key
    }));
    context.skillColumns = buildSkillColumns(system.skills).map((column) => ({
      ...column,
      pointPool: system.skillPoints?.[column.column] ?? 0,
      pointPoolInput: inputNumber(system.skillPoints?.[column.column]),
      groups: column.groups.map((group) => ({
        ...group,
        skills: group.skills.map((skill) => {
          const pending = this._pendingSkillIncreases.get(skill.key) ?? 0;
          return {
            ...skill,
            displayValue: displayNumber(skill.value),
            inputValue: inputNumber(skill.value),
            pending,
            selected: this._selectedSkillKeys.has(skill.key),
            showMinus: pending > 0,
            nextCost: stepCostForLevel(skill.value + 1),
            pool: system.skillPoints?.[skill.column] ?? 0
          };
        })
      }))
    }));
    context.weaponOptions = WEAPON_OPTIONS.map((name) => ({
      name,
      selected: system.weapon?.selected === name
    }));
    context.attack = this._buildAttackContext(system);
    context.damageInput = inputNumber(system.health?.damage);
    context.notesHtml = await renderMarkdown(system.notes, this.actor);
    context.talents = await Promise.all((system.talents ?? []).map(async (talent, index) => ({
      index,
      name: talent.name,
      rank: numberOrZero(talent.rank),
      rankInput: inputNumber(talent.rank),
      hasRank: numberOrZero(talent.rank) !== 0,
      description: talent.description,
      descriptionHtml: await renderMarkdown(talent.description, this.actor),
      target: `system.talents.${index}.description`
    })));

    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);

    if (!this.isEditable) return;

    html.find("[data-action='increase-skill']").on("click", this._onIncreaseSkill.bind(this));
    html.find("[data-action='decrease-skill']").on("click", this._onDecreaseSkill.bind(this));
    html.find("[data-action='toggle-level-up']").on("click", this._onToggleLevelUp.bind(this));
    html.find("[data-action='toggle-skill-edit']").on("click", this._onToggleSkillEdit.bind(this));
    html.find("[data-action='roll-p5']").on("click", this._onRollP5.bind(this));
    html.find("[data-action='roll-n5']").on("click", this._onRollN5.bind(this));
    html.find("[data-action='roll-skill']").on("click", this._onRollSkill.bind(this));
    html.find("[data-action='toggle-roll-skill']").on("change", this._onToggleRollSkill.bind(this));
    html.find("[data-action='roll-selected-skills']").on("click", this._onRollSelectedSkills.bind(this));
    html.find("[data-field='attack-bonus']").on("change input", this._onAttackBonusChange.bind(this));
    html.find("[data-action='toggle-attack-aim-zone']").on("click", this._onToggleAttackAimZone.bind(this));
    html.find("[data-action='attack-target']").on("click", this._onAttackTarget.bind(this));
    html.find("[data-action='open-dimensions']").on("click", this._onOpenDimensions.bind(this));
    html.find("[data-macro-action]").on("dragstart", this._onDragRollMacro.bind(this));
    html.find("[data-action='select-armor-zone']").on("click", this._onSelectArmorZone.bind(this));
    html.find("[data-action='set-armor-material']").on("click", this._onSetArmorMaterial.bind(this));
    html.find("[data-action='repair-armor']").on("click", this._onRepairArmor.bind(this));
    html.find("[data-action='add-talent']").on("click", this._onAddTalent.bind(this));
    html.find("[data-action='toggle-talent-edit']").on("click", this._onToggleTalentEdit.bind(this));
    html.find("[data-action='toggle-notes-edit']").on("click", this._onToggleNotesEdit.bind(this));
  }

  _buildActiveArmorZone(armor) {
    const zoneDef = ARMOR_ZONE_DEFS.find((zone) => zone.key === this._activeArmorZone) ?? ARMOR_ZONE_DEFS[0];
    const zoneData = armor?.[zoneDef.key] ?? {};
    const material = zoneData.material ?? "";
    const materialDef = material ? ARMOR_MATERIALS[material] : null;

    return {
      ...zoneDef,
      material,
      materialLabel: materialDef?.label ?? "No armor",
      breakdown: materialDef ? `${materialDef.label} · Loss ${materialDef.lossNum}/${materialDef.lossDenom}` : "No armor",
      value: numberOrZero(zoneData.value),
      valueInput: armorNumber(zoneData.value),
      battered: numberOrZero(zoneData.battered),
      batteredInput: armorNumber(zoneData.battered),
      displayValue: displayArmor(zoneData.value),
      displayBattered: displayArmor(zoneData.battered),
      materials: buildArmorMaterials(material),
      isTorso: zoneDef.key === "torso",
      isLegs: zoneDef.key === "legs",
      isArms: zoneDef.key === "arms",
      isHead: zoneDef.key === "head"
    };
  }

  _buildAttackContext(system) {
    const weapon = weaponPresetFor(system.weapon?.selected);
    const selectedSkill = system.skills?.[weapon.skill] ? weapon.skill : "Waffenlos";
    const skillValue = numberOrZero(system.skills?.[selectedSkill]?.value);
    const aimedZones = Array.from(this._attackAimZones);
    const aimPct = aimTotalPct(aimedZones);
    const aimPen = aimPenalty(aimedZones);

    return {
      weapon,
      skillKey: selectedSkill,
      skillValue,
      skillValueDisplay: displayNumber(skillValue),
      bonus: this._attackBonus,
      bonusInput: inputNumber(this._attackBonus),
      aimPct,
      aimPen,
      aimSummary: aimPen > 0 ? `${aimPct}% / -${aimPen}` : `${aimPct}%`,
      zoneState: {
        torso: this._attackAimZones.has("torso"),
        legs: this._attackAimZones.has("legs"),
        arms: this._attackAimZones.has("arms"),
        head: this._attackAimZones.has("head")
      },
      aimZones: ARMOR_ZONE_DEFS.map((zone) => ({
        ...zone,
        pct: BASE_HIT_ZONE_PCT[zone.key],
        active: this._attackAimZones.has(zone.key)
      }))
    };
  }

  async _updateObject(event, formData) {
    const updateData = foundry.utils.deepClone(formData);
    this._normalizeEmptyNumberFields(updateData);
    this._mergeTalentUpdateData(updateData);
    return this.actor.update(updateData);
  }

  _normalizeEmptyNumberFields(updateData) {
    const zeroPaths = [
      /^system\.health\.damage$/,
      /^system\.skillPoints\.[^.]+$/,
      /^system\.skills\.[^.]+\.value$/,
      /^system\.armor\.[^.]+\.(value|battered)$/
    ];

    for (const [key, value] of Object.entries(updateData)) {
      if (!zeroPaths.some((pattern) => pattern.test(key))) continue;

      if (value === "" || value === "-") {
        updateData[key] = 0;
      }
    }
  }

  _mergeTalentUpdateData(updateData) {
    const expanded = foundry.utils.expandObject(updateData);
    const incoming = expanded.system?.talents;
    if (incoming === undefined) return;

    const existing = foundry.utils.deepClone(this.actor.toObject().system.talents ?? []);
    const incomingEntries = Array.isArray(incoming)
      ? incoming.entries()
      : Object.entries(incoming).map(([index, value]) => [Number(index), value]);

    for (const [index, partial] of incomingEntries) {
      if (!Number.isInteger(Number(index)) || !partial) continue;

      const current = existing[index] ?? { name: "", rank: null, description: "" };
      existing[index] = {
        ...current,
        ...partial,
        name: partial.name ?? current.name ?? "",
        rank: numberOrZero(partial.rank ?? current.rank) === 0 ? null : partial.rank ?? current.rank ?? null,
        description: partial.description ?? current.description ?? ""
      };
    }

    for (const key of Object.keys(updateData)) {
      if (key === "system.talents" || key.startsWith("system.talents.")) {
        delete updateData[key];
      }
    }

    if (updateData.system?.talents) delete updateData.system.talents;
    updateData["system.talents"] = existing;
  }

  async _onIncreaseSkill(event) {
    event.preventDefault();
    if (!this._levelingUp) return;

    const key = event.currentTarget.dataset.skill;
    const skill = this.actor.system.skills[key];
    if (!skill) return;

    const column = SKILL_COLUMN_BY_KEY[key];
    const current = numberOrZero(skill.value);
    const cost = skillChangeCost(current, current + 1);
    const poolPath = `system.skillPoints.${column}`;
    const available = numberOrZero(this.actor.system.skillPoints?.[column]);

    if (available < cost) {
      ui.notifications.warn(`Not enough ${column} points. Need ${cost}.`);
      return;
    }

    this._pendingSkillIncreases.set(key, (this._pendingSkillIncreases.get(key) ?? 0) + 1);
    await this.actor.update({
      [`system.skills.${key}.value`]: current + 1,
      [poolPath]: available - cost
    });
  }

  async _onRollP5(event) {
    event.preventDefault();
    if (!this._isPlayMode()) return;

    const roll = rollP5();
    await this._postChatMessage({
      title: "p5",
      formula: "p5",
      result: roll.total
    });
  }

  async _onRollN5(event) {
    event.preventDefault();
    if (!this._isPlayMode()) return;

    const roll = rollN5();
    await this._postChatMessage({
      title: "n5",
      formula: `${roll.plus} - ${roll.minus}`,
      result: roll.total
    });
  }

  async _onRollSkill(event) {
    event.preventDefault();
    if (!this._isPlayMode()) return;

    const key = event.currentTarget.dataset.skill;
    await this.rollSkill(key);
  }

  async rollSkill(key) {
    if (key === "Initiative") {
      await this.actor.rollInitiative({ createCombatants: true, rerollInitiative: true });
      return;
    }

    const participants = this._getCombinedRollParticipants();
    const selected = participants
      .map((actor) => this._skillContributionForActor(actor, key))
      .filter(Boolean);

    if (!selected.length) return;

    const base = combineSkillValues(selected.map((skill) => skill.adjustedValue));
    const roll = rollN5();
    const total = base + roll.total;

    await this._postChatMessage({
      title: this._rollTitle(selected),
      subtitle: this._rollSources(selected),
      base,
      plus: roll.plus,
      minus: roll.minus,
      result: total
    });
  }

  _onToggleRollSkill(event) {
    if (!this._isPlayMode()) return;

    const key = event.currentTarget.dataset.skill;
    if (!key) return;

    if (event.currentTarget.checked) this._selectedSkillKeys.add(key);
    else this._selectedSkillKeys.delete(key);

    this.render(false);
  }

  _onAttackBonusChange(event) {
    this._attackBonus = numberOrZero(event.currentTarget.value);
  }

  async _onRollSelectedSkills(event) {
    event.preventDefault();
    if (!this._isPlayMode()) return;

    const participants = this._getCombinedRollParticipants();
    const selected = participants.flatMap((actor) => this._selectedSkillsForActor(actor));

    if (!selected.length) {
      ui.notifications.warn("Select one or more skills first.");
      return;
    }

    if (selected.length === 1 && selected[0].actorId === this.actor.id && selected[0].key === "Initiative") {
      await this.actor.rollInitiative({ createCombatants: true, rerollInitiative: true });
      return;
    }

    const base = combineSkillValues(selected.map((skill) => skill.adjustedValue));
    const roll = rollN5();
    const total = base + roll.total;

    await this._postChatMessage({
      title: this._rollTitle(selected),
      subtitle: this._rollSources(selected),
      base,
      plus: roll.plus,
      minus: roll.minus,
      result: total
    });
  }

  _onToggleAttackAimZone(event) {
    event.preventDefault();
    if (!this._isPlayMode()) return;

    const zone = event.currentTarget.dataset.zone;
    if (!zone) return;

    if (this._attackAimZones.has(zone)) {
      if (this._attackAimZones.size <= 1) return;
      this._attackAimZones.delete(zone);
    } else {
      this._attackAimZones.add(zone);
    }

    this.render(false);
  }

  async _onAttackTarget(event) {
    event.preventDefault();
    if (!this._isPlayMode()) return;

    const root = $(event.currentTarget).closest(".scifi-urpg-character-sheet");
    this._attackBonus = numberOrZero(root.find("[data-field='attack-bonus']").val());

    await this.submit({ preventClose: true });

    await this.attackTarget({
      bonus: this._attackBonus,
      aimZones: Array.from(this._attackAimZones)
    });
  }

  async attackTarget({ bonus = 0, aimZones = DEFAULT_AIM_ZONES } = {}) {
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

    const weapon = weaponPresetFor(this.actor.system.weapon?.selected);
    const skillKey = this.actor.system.skills?.[weapon.skill] ? weapon.skill : "Waffenlos";
    const distance = this._distanceToTarget(targetToken);
    if (distance === null) {
      ui.notifications.warn("Place this actor on the scene before attacking.");
      return;
    }

    const meleeReach = this._meleeReach();
    if (!weapon.range && distance > meleeReach) {
      ui.notifications.warn(`${weapon.name} is a melee weapon. Move within ${meleeReach} ${canvas.scene?.grid?.units || "grid unit"} before attacking.`);
      return;
    }

    const outcome = resolveAttack({
      attacker: this.actor,
      target,
      skillKey,
      bonus: numberOrZero(bonus),
      distance,
      aimZones
    });

    const updateRequest = await game.scifiUrpg.updateActor(target, outcome.updateData, { token: targetToken });

    await this._postAttackMessage(outcome, { updateRequest });
  }

  _onDragRollMacro(event) {
    const action = event.currentTarget.dataset.macroAction;
    if (!action) return;

    const dragData = {
      type: "scifi-urpg.roll",
      actorId: this.actor.id,
      action
    };

    if (action === "skill") dragData.skillKey = event.currentTarget.dataset.skill;
    if (action === "attack") {
      const root = $(event.currentTarget).closest(".scifi-urpg-character-sheet");
      dragData.bonus = numberOrZero(root.find("[data-field='attack-bonus']").val());
      dragData.aimZones = Array.from(this._attackAimZones);
    }

    event.originalEvent?.dataTransfer?.setData("text/plain", JSON.stringify(dragData));
  }

  _distanceToTarget(targetToken) {
    const attackerToken = this._attackerToken();
    if (!attackerToken || !targetToken) return null;

    const attackerCenter = this._tokenCenter(attackerToken);
    const targetCenter = this._tokenCenter(targetToken);
    const measured = this._measureSceneDistance(attackerCenter, targetCenter);
    if (Number.isFinite(measured)) return Math.round(measured);

    const gridSize = Number(canvas.scene?.grid?.size ?? canvas.grid?.size ?? 100) || 100;
    const gridDistance = Number(canvas.scene?.grid?.distance ?? 1) || 1;
    const pixelDistance = Math.hypot(targetCenter.x - attackerCenter.x, targetCenter.y - attackerCenter.y);

    return Math.round((pixelDistance / gridSize) * gridDistance);
  }

  _meleeReach() {
    return Math.max(1, Number(canvas.scene?.grid?.distance ?? 1) || 1);
  }

  _measureSceneDistance(origin, destination) {
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

  _attackerToken() {
    const controlled = canvas.tokens?.controlled?.find((token) => token.actor?.id === this.actor.id);
    if (controlled) return controlled;

    const activeTokens = this.actor.getActiveTokens?.(false, false) ?? [];
    return activeTokens[0] ?? null;
  }

  _tokenCenter(token) {
    if (token.center) return token.center;

    const document = token.document ?? token;
    const width = Number(document.width ?? 1) * (Number(canvas.scene?.grid?.size ?? canvas.grid?.size ?? 100) || 100);
    const height = Number(document.height ?? 1) * (Number(canvas.scene?.grid?.size ?? canvas.grid?.size ?? 100) || 100);
    return {
      x: Number(document.x ?? token.x ?? 0) + width / 2,
      y: Number(document.y ?? token.y ?? 0) + height / 2
    };
  }

  _getCombinedRollParticipants() {
    const actorsById = new Map([[this.actor.id, this.actor]]);

    for (const token of game.user?.targets ?? []) {
      const actor = token.actor;
      if (actor?.type === "character") actorsById.set(actor.id, actor);
    }

    return Array.from(actorsById.values());
  }

  _selectedSkillsForActor(actor) {
    return Array.from(this._selectedSkillKeys)
      .map((key) => this._skillContributionForActor(actor, key))
      .filter(Boolean);
  }

  _skillContributionForActor(actor, key) {
    const skill = actor.system.skills?.[key];
    if (!skill) return null;

    const value = numberOrZero(skill.value);
    const damage = Math.max(0, numberOrZero(actor.system.health?.damage));

    return {
      actorId: actor.id,
      actorName: actor.name,
      key,
      adjustedValue: value - damage
    };
  }

  _rollSources(selected) {
    const actorNames = [];
    const actorNameSet = new Set();

    for (const skill of selected) {
      if (actorNameSet.has(skill.actorName)) continue;
      actorNameSet.add(skill.actorName);
      actorNames.push(skill.actorName);
    }

    return actorNames.join(", ");
  }

  _rollTitle(selected) {
    const skillNames = [];
    const skillNameSet = new Set();

    for (const skill of selected) {
      if (skillNameSet.has(skill.key)) continue;
      skillNameSet.add(skill.key);
      skillNames.push(skill.key);
    }

    return skillNames.join(" ⊕ ");
  }

  async _postChatMessage({ title, subtitle = "", formula = "", base = null, plus = null, minus = null, result }) {
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    SciFiDimensionsApp.setLatestForActor(this.actor, result);
    const details = base === null
      ? `<div class="roll-formula">${foundry.utils.escapeHTML(formula)}</div>`
      : `<div class="roll-formula">${Number(base)} + ${Number(plus)} - ${Number(minus)}</div>`;

    const content = `
      <div class="scifi-urpg-chat-card" data-scifi-urpg-roll-result="${Number(result)}" data-scifi-urpg-actor-id="${foundry.utils.escapeHTML(this.actor.id)}">
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

  async _postAttackMessage(outcome, { updateRequest = null } = {}) {
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const escapedTarget = foundry.utils.escapeHTML(outcome.target.name);
    const escapedWeapon = foundry.utils.escapeHTML(outcome.weapon.name);
    const title = outcome.skillKey;
    const formula = this._attackFormula(outcome);
    const damageSection = outcome.hit ? this._attackResultSection({
      title: "Damage",
      formula: this._damageFormula(outcome),
      result: outcome.damage
    }) : "";
    const armorLossSection = outcome.armorLoss && outcome.armorBefore !== outcome.armorAfter ? this._attackResultSection({
      title: "Armor Loss",
      formula: this._armorLossFormula(outcome),
      result: fmtArmor(outcome.armorLoss.loss)
    }) : "";
    const downHtml = outcome.targetDown
      ? `<div class="attack-status-line">${escapedTarget} is down!</div>`
      : "";

    const content = `
      <div class="scifi-urpg-chat-card attack-card" data-scifi-urpg-roll-result="${Number(outcome.result)}" data-scifi-urpg-actor-id="${foundry.utils.escapeHTML(this.actor.id)}">
        <h3>${foundry.utils.escapeHTML(title)}</h3>
        <p>${foundry.utils.escapeHTML(this.actor.name)} attacks ${escapedTarget} with ${escapedWeapon}</p>
        <div class="roll-formula">${foundry.utils.escapeHTML(formula)}</div>
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

  _attackFormula(outcome) {
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

  _attackResultSection({ title, formula, result }) {
    return `
      <section class="attack-result-section">
        <h4>${foundry.utils.escapeHTML(title)}</h4>
        <div class="roll-formula">${foundry.utils.escapeHTML(formula)}</div>
        <div class="roll-result">${foundry.utils.escapeHTML(String(result))}</div>
      </section>
    `;
  }

  _damageFormula(outcome) {
    return `${outcome.result}/5 + ${outcome.weapon.bep} (weapon) - ${fmtArmor(outcome.armorBefore)} (${outcome.zone})`;
  }

  _armorLossFormula(outcome) {
    const { ruestungseffekt, trefferzonenPct, material, eaten } = outcome.armorLoss;
    return `${ruestungseffekt}% (effect) / ${trefferzonenPct}% (zone) x ${material.lossNum}/${material.lossDenom} (loss) x ${fmtArmor(eaten)} (damage)`;
  }

  _onOpenDimensions(event) {
    event.preventDefault();
    SciFiDimensionsApp.openForActor(this.actor);
  }

  async _onDecreaseSkill(event) {
    event.preventDefault();
    if (!this._levelingUp) return;

    const key = event.currentTarget.dataset.skill;
    const pending = this._pendingSkillIncreases.get(key) ?? 0;
    if (pending <= 0) return;

    const skill = this.actor.system.skills[key];
    if (!skill) return;

    const column = SKILL_COLUMN_BY_KEY[key];
    const current = numberOrZero(skill.value);
    if (current <= 0) return;

    const refund = -skillChangeCost(current, current - 1);
    const poolPath = `system.skillPoints.${column}`;
    const available = numberOrZero(this.actor.system.skillPoints?.[column]);

    if (pending === 1) this._pendingSkillIncreases.delete(key);
    else this._pendingSkillIncreases.set(key, pending - 1);

    await this.actor.update({
      [`system.skills.${key}.value`]: current - 1,
      [poolPath]: available + refund
    });
  }

  async _onToggleLevelUp(event) {
    event.preventDefault();

    if (this._levelingUp) {
      await this.submit({ preventClose: true });
      this._pendingSkillIncreases.clear();
      this._levelingUp = false;
    } else {
      if (this._editingSkills) await this.submit({ preventClose: true });
      this._editingSkills = false;
      this._levelingUp = true;
    }

    this.render(false);
  }

  async _onToggleSkillEdit(event) {
    event.preventDefault();

    if (this._editingSkills) {
      await this.submit({ preventClose: true });
      this._editingSkills = false;
    } else {
      if (this._levelingUp) {
        await this.submit({ preventClose: true });
        this._pendingSkillIncreases.clear();
      }
      this._levelingUp = false;
      this._editingSkills = true;
    }

    this.render(false);
  }

  async _onAddTalent(event) {
    event.preventDefault();

    const talents = foundry.utils.deepClone(this.actor.toObject().system.talents ?? []);
    talents.push({
      name: "",
      rank: null,
      description: ""
    });

    this._editingTalents = true;
    await this.actor.update({ "system.talents": talents });
  }

  _onSelectArmorZone(event) {
    event.preventDefault();

    const zone = event.currentTarget.dataset.zone;
    if (!zone) return;

    this._activeArmorZone = zone;
    this.render(false);
  }

  async _onSetArmorMaterial(event) {
    event.preventDefault();

    const zone = this._activeArmorZone;
    const requested = event.currentTarget.dataset.material || null;
    const current = this.actor.system.armor?.[zone]?.material ?? null;
    const material = requested === current ? null : requested;
    const updateData = {
      [`system.armor.${zone}.material`]: material
    };

    if (material && ARMOR_MATERIALS[material]) {
      const bep = ARMOR_MATERIALS[material].bep;
      updateData[`system.armor.${zone}.value`] = bep;
      updateData[`system.armor.${zone}.battered`] = bep;
    }

    if (!material) {
      updateData[`system.armor.${zone}.value`] = 0;
      updateData[`system.armor.${zone}.battered`] = 0;
    }

    await this.actor.update(updateData);
  }

  async _onRepairArmor(event) {
    event.preventDefault();

    const updateData = {};
    for (const [zone, armor] of Object.entries(this.actor.system.armor ?? {})) {
      updateData[`system.armor.${zone}.battered`] = Number(armor.value ?? 0);
    }

    await this.actor.update(updateData);
  }

  async _onToggleTalentEdit(event) {
    event.preventDefault();

    if (this._editingTalents) {
      await this.submit({ preventClose: true });
      this._editingTalents = false;
      await this._removeEmptyTalents();
    } else {
      this._editingTalents = true;
    }

    this.render(true);
  }

  async _onToggleNotesEdit(event) {
    event.preventDefault();

    if (this._editingNotes) {
      await this.submit({ preventClose: true });
      this._editingNotes = false;
    } else {
      this._editingNotes = true;
    }

    this.render(true);
  }

  async _removeEmptyTalents() {
    const talents = foundry.utils.deepClone(this.actor.toObject().system.talents ?? []);
    const filtered = talents.filter((talent) => !this._isEmptyTalent(talent));
    if (filtered.length !== talents.length) {
      await this.actor.update({ "system.talents": filtered });
    }
  }

  _isEmptyTalent(talent) {
    const name = String(talent?.name ?? "").trim();
    const description = String(talent?.description ?? "").trim();
    const hasRank = numberOrZero(talent?.rank) !== 0;

    return !description && !hasRank && (!name || name === "Talent");
  }

  _isPlayMode() {
    return !this._levelingUp && !this._editingSkills;
  }
}
