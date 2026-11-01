import { actorNameElement, postRollCard } from "../chat.mjs";
import { distanceToTarget } from "../rules/distance.mjs";
import {
  applyShipAcceleration,
  convertDilithium,
  generateReactorEnergy,
  rechargeShields,
  resolveShipAttack,
  shipCrewRoleTotal,
  shipWeaponEnergyCost,
} from "../rules/ship-combat.mjs";
import { calculateShipSpecification, SHIP_PROFILES, standardShipDesign } from "../rules/ship-design.mjs";
import { starterShipWeaponSource } from "../constants.mjs";
import { n5Formula, rollN5 } from "../rules/dice.mjs";

const CREW_SKILL_ROLLS = {
  gunner: { skill: "Eingebettete", roleName: "gunner" },
  pilot: { skill: "Raumfahrzeuge", roleName: "pilot" },
};

function number(value) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function designInput(design = {}) {
  const standard = standardShipDesign(design.baseMark);
  const massOverride = (value) => value === null || value === undefined || value === ""
    ? null
    : Math.max(0, number(value));
  return {
    mode: design.mode === "custom" ? "custom" : "standard",
    baseMark: SHIP_PROFILES[design.baseMark] ? design.baseMark : standard.baseMark,
    length: Math.max(0, number(design.length ?? standard.length)),
    tonnageOverride: design.tonnageOverride === null || design.tonnageOverride === undefined
      ? null
      : Math.max(0, number(design.tonnageOverride)),
    hullThicknessOverride: design.hullThicknessOverride === null || design.hullThicknessOverride === undefined || design.hullThicknessOverride === ""
      ? null
      : Math.max(1, number(design.hullThicknessOverride)),
    batteryMassOverride: massOverride(design.batteryMassOverride),
    generatorMassOverride: massOverride(design.generatorMassOverride),
    shieldMassOverride: massOverride(design.shieldMassOverride),
    gunMassOverride: massOverride(design.gunMassOverride),
  };
}

function displayShipNumber(value) {
  const rounded = Math.round((number(value) + Number.EPSILON) * 1_000) / 1_000;
  return String(rounded);
}

function displaySpecification(specification) {
  return Object.fromEntries(Object.entries(specification).map(([key, value]) => [key, displayShipNumber(value)]));
}

function resolvedCrewMembers(ship) {
  return (ship?.system?.crew?.members ?? []).flatMap((member) => {
    const actor = game.actors?.get(member.actorId);
    return actor?.type === "character" ? [{
      actor,
      pilot: !!member.pilot,
      gunner: !!member.gunner,
    }] : [];
  });
}

export class SciFiShipSheet extends ActorSheet {
  constructor(...args) {
    super(...args);
    this._acceleration = { x: 0, y: 0 };
    this._dilithiumConversion = 0;
    this._attackBonus = 0;
    this._editingDesign = false;
    this._pendingDesign = null;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["scifi-urpg", "sheet", "actor", "ship"],
      template: "systems/scifi-urpg/templates/actor/ship-sheet.hbs",
      width: 760,
      height: 700,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "overview" }],
    });
  }

  get template() {
    return "systems/scifi-urpg/templates/actor/ship-sheet.hbs";
  }

  async getData(options = {}) {
    const context = await super.getData(options);
    const system = this.actor.system;

    context.system = system;
    context.design = designInput(system.design);
    context.specification = calculateShipSpecification(context.design);
    context.specificationDisplay = context.specification ? displaySpecification(context.specification) : null;
    context.isCustomDesign = context.design.mode === "custom";
    context.editingDesign = this._editingDesign;
    context.designEdit = this._pendingDesign ?? context.design;
    context.designEditTonnage = context.designEdit.tonnageOverride
      ?? calculateShipSpecification(context.designEdit).tonnage;
    context.designEditSpecification = calculateShipSpecification(context.designEdit);
    context.tonnageIsOverridden = context.design.tonnageOverride !== null;
    context.crewMembers = (system.crew?.members ?? []).flatMap((member, index) => {
      const actor = game.actors?.get(member.actorId);
      return actor?.type === "character" ? [{
        index,
        id: actor.id,
        name: actor.name,
        img: actor.img,
        pilot: !!member.pilot,
        gunner: !!member.gunner,
      }] : [];
    });
    const weapons = this.actor.items
      .filter((item) => item.type === "shipWeapon")
      .map((item) => ({
        id: item.id,
        name: item.name,
        img: item.img,
        bep: number(item.system.bep),
        energy: shipWeaponEnergyCost(item),
        rangeModifier: number(item.system.rangeModifier),
        selected: item.id === system.weapon?.selected,
      }));
    const selectedWeapon = weapons.find((weapon) => weapon.selected) ?? weapons[0] ?? null;
    context.weapons = weapons;
    context.attack = {
      weapon: selectedWeapon,
      weaponName: selectedWeapon?.name ?? "No weapon selected",
      bonusInput: this._attackBonus || "",
      hasWeapon: !!selectedWeapon,
    };
    context.acceleration = this._acceleration;
    context.dilithiumConversion = this._dilithiumConversion;
    context.speed = Math.hypot(number(system.movement?.velocityX), number(system.movement?.velocityY));
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;

    html.find("[data-action='delete-crew-member']").on("click", this._onDeleteCrewMember.bind(this));
    html.find("[data-action='toggle-crew-role']").on("change", this._onToggleCrewRole.bind(this));
    html.find("[data-action='roll-crew-skill']").on("click", this._onRollCrewSkill.bind(this));
    html.find("[data-action='attack-target']").on("click", this._onAttackTarget.bind(this));
    html.find("[data-field='attack-bonus']").on("input change", this._onAttackBonusChange.bind(this));
    html.find("[data-action='select-weapon']").on("click", this._onSelectWeapon.bind(this));
    html.find("[data-action='add-weapon']").on("click", this._onAddWeapon.bind(this));
    html.find("[data-action='edit-weapon']").on("click", this._onEditWeapon.bind(this));
    html.find("[data-action='delete-weapon']").on("click", this._onDeleteWeapon.bind(this));
    html.find("[data-action='recharge-shields']").on("click", this._onRechargeShields.bind(this));
    html.find("[data-action='generate-reactor-energy']").on("click", this._onGenerateReactorEnergy.bind(this));
    html.find("[data-action='convert-dilithium']").on("click", this._onConvertDilithium.bind(this));
    html.find("[data-action='toggle-design-edit']").on("click", this._onToggleDesignEdit.bind(this));
    html.find("[data-field='dilithium-conversion']").on("input change", this._onDilithiumConversionChange.bind(this));
    html.find("[data-field='design-mark']").on("change", this._onPendingDesignMarkChange.bind(this));
    html.find("[data-field='design-length']").on("change", this._onPendingDesignLengthChange.bind(this));
    html.find("[data-field='design-tonnage-override']").on("input change", this._onPendingDesignTonnageOverrideChange.bind(this));
    html.find("[data-field='design-hull-thickness']").on("input change", this._onPendingHullThicknessChange.bind(this));
    html.find("[data-field='design-component-mass']").on("input change", this._onPendingComponentMassChange.bind(this));
    html.find("input[inputmode='decimal']").on("focus", this._onSelectNumericInput.bind(this));
    html.find("[data-field='acceleration-x']").on("input change", this._onAccelerationChange.bind(this));
    html.find("[data-field='acceleration-y']").on("input change", this._onAccelerationChange.bind(this));
    html.find("[data-action='apply-acceleration']").on("click", this._onApplyAcceleration.bind(this));
  }

  async _onDrop(event) {
    // Foundry's DragDrop controller can retarget a drop to the form instead of
    // the element under the pointer. In that case, use the visible Crew tab.
    const crewTab = event.target?.closest?.(".sheet-body .tab[data-tab='crew']")
      ?? this.element?.find(".sheet-body .tab[data-tab='crew'].active")?.[0];
    if (!crewTab) return super._onDrop(event);

    const data = TextEditor.getDragEventData(event);
    if (data?.type !== "Actor") return super._onDrop(event);
    const actor = data.uuid ? await fromUuid(data.uuid) : game.actors?.get(data.id);
    if (actor?.type !== "character") {
      ui.notifications.warn("Only SciFi character actors can be assigned as ship crew.");
      return false;
    }

    const members = [...(this.actor.system.crew?.members ?? []), {
      actorId: actor.id,
      pilot: false,
      gunner: false,
    }];
    await this.actor.update({ "system.crew.members": members });
    return false;
  }

  _onSelectNumericInput(event) {
    event.currentTarget.select();
  }

  async _onDeleteCrewMember(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.crewIndex);
    if (!Number.isInteger(index) || index < 0) return;
    const members = [...(this.actor.system.crew?.members ?? [])];
    members.splice(index, 1);
    await this.actor.update({ "system.crew.members": members });
  }

  async _updateDesign(design) {
    const normalized = designInput(design);
    const specification = calculateShipSpecification(normalized);
    await this.actor.update({
      "system.mark": normalized.baseMark,
      "system.design.mode": normalized.mode,
      "system.design.baseMark": normalized.baseMark,
      "system.design.length": normalized.length,
      "system.design.tonnageOverride": normalized.tonnageOverride,
      "system.design.hullThicknessOverride": normalized.hullThicknessOverride,
      "system.design.batteryMassOverride": normalized.batteryMassOverride,
      "system.design.generatorMassOverride": normalized.generatorMassOverride,
      "system.design.shieldMassOverride": normalized.shieldMassOverride,
      "system.design.gunMassOverride": normalized.gunMassOverride,
      // Persist a reduced operational state. Derived maxima are calculated by
      // ShipDataModel, so a refit cannot be used to refill a depleted ship.
      "system.hull.value": Math.min(number(this.actor.system.hull?.value), specification.hullProtection),
      "system.shields.value": Math.min(number(this.actor.system.shields?.value), specification.shieldCapacity),
      "system.energy.value": Math.min(number(this.actor.system.energy?.value), specification.batteryCapacity),
    });
  }

  async _onToggleDesignEdit(event) {
    event.preventDefault();
    if (this._editingDesign) {
      const design = this._pendingDesign ?? designInput(this.actor.system.design);
      this._setDesignEditing(false);
      this._pendingDesign = null;
      await this._updateDesign(design);
      return;
    }
    const design = designInput(this.actor.system.design);
    this._pendingDesign = design;
    this._setDesignEditing(true);
  }

  _setDesignEditing(editing) {
    this._editingDesign = editing;
    const editor = this.element?.find(".ship-design-editor");
    editor?.prop?.("hidden", !editing);
    const button = this.element?.find("[data-action='toggle-design-edit']");
    const toggledButton = button?.toggleClass?.("active", editing) ?? button;
    toggledButton?.text?.(editing ? "Done" : "Edit");
  }

  async _ensureStarterShipWeapon(specification = null) {
    if (this.actor.items?.some?.((item) => item.type === "shipWeapon")) return;
    await this._createCalculatedShipWeapon(specification);
  }

  async _createCalculatedShipWeapon(specification = null) {
    const calculated = specification ?? calculateShipSpecification(designInput(this.actor.system.design));
    await this.actor.createEmbeddedDocuments("Item", [starterShipWeaponSource(calculated)]);
  }

  _onPendingDesignMarkChange(event) {
    const mark = event.currentTarget.value;
    if (!SHIP_PROFILES[mark]) return;
    this._pendingDesign = standardShipDesign(mark);
    this._refreshPendingDesignInputs();
  }

  _onPendingDesignLengthChange(event) {
    const length = number(event.currentTarget.value);
    if (length < 0) return;
    this._pendingDesign = {
      ...(this._pendingDesign ?? designInput(this.actor.system.design)),
      mode: "custom",
      length,
      // A new length gets a fresh calculated tonnage. It becomes an override
      // only if the user subsequently edits the Tonnage input.
      tonnageOverride: null,
      batteryMassOverride: null,
      generatorMassOverride: null,
      shieldMassOverride: null,
      gunMassOverride: null,
    };
    this._refreshPendingDesignInputs();
  }

  _onPendingDesignTonnageOverrideChange(event) {
    const value = String(event.currentTarget.value ?? "").trim();
    const tonnageOverride = value === "" ? null : number(value);
    if (tonnageOverride !== null && tonnageOverride < 0) return;
    this._pendingDesign = {
      ...(this._pendingDesign ?? designInput(this.actor.system.design)),
      mode: "custom",
      tonnageOverride,
      batteryMassOverride: null,
      generatorMassOverride: null,
      shieldMassOverride: null,
      gunMassOverride: null,
    };
    this._refreshPendingDesignInputs();
  }

  _onPendingHullThicknessChange(event) {
    const value = String(event.currentTarget.value ?? "").trim();
    const hullThicknessOverride = value === "" ? null : number(value);
    if (hullThicknessOverride !== null && hullThicknessOverride < 1) return;
    this._pendingDesign = {
      ...(this._pendingDesign ?? designInput(this.actor.system.design)),
      mode: "custom",
      hullThicknessOverride,
    };
    this._refreshPendingDesignInputs();
  }

  _onPendingComponentMassChange(event) {
    const key = event.currentTarget.dataset.designOverride;
    if (!["batteryMassOverride", "generatorMassOverride", "shieldMassOverride", "gunMassOverride"].includes(key)) return;
    const value = String(event.currentTarget.value ?? "").trim();
    const override = value === "" ? null : number(value);
    if (override !== null && override < 0) return;
    this._pendingDesign = { ...(this._pendingDesign ?? designInput(this.actor.system.design)), mode: "custom", [key]: override };
  }

  _refreshPendingDesignInputs() {
    const specification = calculateShipSpecification(this._pendingDesign ?? designInput(this.actor.system.design));
    this.element?.find("[data-field='design-length']")?.val(specification.length);
    this.element?.find("[data-field='design-tonnage-override']")?.val(specification.tonnage);
    this.element?.find("[data-field='design-hull-thickness']")?.val(specification.hullThickness);
    this.element?.find("[data-design-override='batteryMassOverride']")?.val(specification.batteryMass);
    this.element?.find("[data-design-override='generatorMassOverride']")?.val(specification.generatorMass);
    this.element?.find("[data-design-override='shieldMassOverride']")?.val(specification.shieldMass);
    this.element?.find("[data-design-override='gunMassOverride']")?.val(specification.gunMass);
  }

  async _onToggleCrewRole(event) {
    const index = Number(event.currentTarget.dataset.crewIndex);
    const role = event.currentTarget.dataset.crewRole;
    if (!Number.isInteger(index) || index < 0 || !["pilot", "gunner"].includes(role)) return;
    const members = [...(this.actor.system.crew?.members ?? [])];
    if (!members[index]) return;
    members[index] = { ...members[index], [role]: !!event.currentTarget.checked };
    await this.actor.update({ "system.crew.members": members });
  }

  async _onRollCrewSkill(event) {
    event.preventDefault();
    const role = event.currentTarget.dataset.crewRole;
    const configuration = CREW_SKILL_ROLLS[role];
    if (!configuration) return;

    await this.submit({ preventClose: true });
    const crewMembers = resolvedCrewMembers(this.actor);
    const assignedCrew = crewMembers.filter((member) => member[role]);
    if (!assignedCrew.length) {
      ui.notifications.warn(`Assign at least one ${configuration.roleName} before rolling ${configuration.skill}.`);
      return;
    }

    const base = shipCrewRoleTotal(crewMembers, role, configuration.skill);
    const roll = rollN5();
    const result = base + roll.total;
    const crewNames = [...new Set(assignedCrew.map((member) => member.actor.name))].join(", ");
    const formula = `${base} ${n5Formula(roll)}`;
    const content = `
      <div class="scifi-urpg-chat-card" data-scifi-urpg-roll-result="${Number(result)}" data-scifi-urpg-actor-id="${foundry.utils.escapeHTML(this.actor.id)}">
        <h3>${configuration.skill}</h3>
        <p>${actorNameElement(this.actor)}: ${foundry.utils.escapeHTML(crewNames)}</p>
        <div class="roll-formula">${foundry.utils.escapeHTML(formula)}</div>
        <div class="roll-result">${result}</div>
      </div>
    `;
    const publicContent = `
      <div class="scifi-urpg-chat-card" data-scifi-urpg-roll-result="${Number(result)}" data-scifi-urpg-actor-id="${foundry.utils.escapeHTML(this.actor.id)}">
        <h3>${configuration.skill}</h3>
        <p>${actorNameElement(this.actor)}: ${foundry.utils.escapeHTML(crewNames)}</p>
        <div class="roll-result">${result}</div>
      </div>
    `;

    await postRollCard(this.actor, {
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      publicContent,
      result,
    });
  }

  _onAttackBonusChange(event) {
    this._attackBonus = number(event.currentTarget.value);
  }

  async _onSelectWeapon(event) {
    event.preventDefault();
    const weaponId = event.currentTarget.dataset.itemId;
    if (weaponId) await this.actor.update({ "system.weapon.selected": weaponId });
  }

  async _onAttackTarget(event) {
    event.preventDefault();
    await this.submit({ preventClose: true });
    const weapon = this.actor.items.get(this.actor.system.weapon?.selected)
      ?? this.actor.items.find((item) => item.type === "shipWeapon");
    const targetToken = game.user?.targets?.size === 1 ? [...game.user.targets][0] : null;
    const target = targetToken?.actor;
    if (!weapon || target?.type !== "ship") {
      ui.notifications.warn("Target exactly one SciFi ship before firing.");
      return;
    }
    const distance = distanceToTarget(this.actor, targetToken);
    if (distance === null) {
      ui.notifications.warn("Place both ships on the scene before firing.");
      return;
    }
    const crewMembers = resolvedCrewMembers(this.actor);
    if (!crewMembers.some((member) => member.gunner)) {
      ui.notifications.warn("Assign at least one gunner before firing.");
      return;
    }
    const energyCost = shipWeaponEnergyCost(weapon);
    if (energyCost > number(this.actor.system.energy?.value)) {
      ui.notifications.warn(`Insufficient energy: firing ${weapon.name} needs ${energyCost} kWs.`);
      return;
    }

    const outcome = resolveShipAttack({
      attacker: this.actor,
      target,
      weapon,
      crewMembers,
      targetCrewMembers: resolvedCrewMembers(target),
      bonus: this._attackBonus,
      distance,
    });
    if (Object.keys(outcome.attackerUpdateData).length) {
      await game.scifiUrpg.updateShip(this.actor, outcome.attackerUpdateData);
    }
    await game.scifiUrpg.updateShip(target, outcome.updateData, {
      token: targetToken,
      beforeApply: (updateRequest) => this._postAttackMessage(outcome, { updateRequest }),
    });
  }

  async _onAddWeapon(event) {
    event.preventDefault();
    await this._createCalculatedShipWeapon(calculateShipSpecification(designInput(this.actor.system.design)));
  }

  _onEditWeapon(event) {
    event.preventDefault();
    this.actor.items.get(event.currentTarget.dataset.itemId)?.sheet?.render(true);
  }

  async _onDeleteWeapon(event) {
    event.preventDefault();
    const item = this.actor.items.get(event.currentTarget.dataset.itemId);
    if (item) await item.delete();
  }

  async _onRechargeShields(event) {
    event.preventDefault();
    await this.submit({ preventClose: true });
    const recharge = rechargeShields(this.actor);
    if (!recharge.transfer) {
      ui.notifications.info("Shields are full or the battery is empty.");
      return;
    }
    await this.actor.update(recharge.updateData);
  }

  async _onGenerateReactorEnergy(event) {
    event.preventDefault();
    await this.submit({ preventClose: true });
    const generation = generateReactorEnergy(this.actor);
    if (!generation.generated) {
      ui.notifications.info("Battery is full or the reactor has no output.");
      return;
    }
    await this.actor.update(generation.updateData);
  }

  _onDilithiumConversionChange(event) {
    this._dilithiumConversion = Math.max(0, number(event.currentTarget.value));
  }

  async _onConvertDilithium(event) {
    event.preventDefault();
    await this.submit({ preventClose: true });
    const conversion = convertDilithium(this.actor, this._dilithiumConversion);
    if (!conversion.tonnes) {
      ui.notifications.info("No Dilithium was converted; increase battery capacity or the amount to convert.");
      return;
    }
    await this.actor.update(conversion.updateData);
    this._dilithiumConversion = 0;
  }

  _onAccelerationChange(event) {
    const axis = event.currentTarget.dataset.field === "acceleration-x" ? "x" : "y";
    this._acceleration[axis] = number(event.currentTarget.value);
  }

  async _onApplyAcceleration(event) {
    event.preventDefault();
    await this.submit({ preventClose: true });
    const movement = applyShipAcceleration(this.actor, this._acceleration);
    if (!movement.affordable) {
      ui.notifications.warn(`Insufficient energy: this manoeuvre needs ${movement.cost} kWs.`);
      return;
    }
    await this.actor.update(movement.updateData);
    this._acceleration = { x: 0, y: 0 };
  }

  async _postAttackMessage(outcome, { updateRequest = null } = {}) {
    const formula = [
      `${outcome.gunnery} (Eingebettete)`,
      outcome.bonus ? `${outcome.bonus >= 0 ? "+" : "−"} ${Math.abs(outcome.bonus)}` : null,
      outcome.rangePenalty ? `${outcome.rangePenalty >= 0 ? "+" : "−"} ${Math.abs(outcome.rangePenalty)}` : null,
      `− ${outcome.evasion} (Raumfahrzeuge)`,
      // Keep the random roll last so the deterministic comparison is easy to read.
      `+ ${n5Formula(outcome.roll, { leadingPlus: false })}`,
    ].filter(Boolean).join(" ");
    const weaponName = foundry.utils.escapeHTML(outcome.weapon?.name ?? "ship weapon");
    const damage = outcome.hit
      ? `<p>Damage ${outcome.rawDamage} kBEP: shields absorb ${outcome.shieldDamage}; hull takes ${outcome.hullDamage}.</p>`
      : "<p>Miss: no damage.</p>";
    const content = `
      <div class="scifi-urpg-chat-card attack-card">
        <h3>Eingebettete</h3>
        <p>${actorNameElement(this.actor)} attacks ${actorNameElement(outcome.target)} with ${weaponName}</p>
        <div class="roll-formula">${foundry.utils.escapeHTML(formula)}</div>
        <div class="roll-result">${outcome.result.toFixed(1)}</div>
        ${outcome.energyCost ? `<p>${outcome.energyCost} kWs expended.</p>` : ""}
        ${damage}
      </div>`;
    const publicContent = `
      <div class="scifi-urpg-chat-card attack-card">
        <h3>Eingebettete</h3>
        <p>${actorNameElement(this.actor)} attacks ${actorNameElement(outcome.target)} with ${weaponName}</p>
        <div class="roll-result">${outcome.result.toFixed(1)}</div>
        ${outcome.energyCost ? `<p>${outcome.energyCost} kWs expended.</p>` : ""}
        ${damage}
      </div>`;
    const flags = updateRequest ? { "scifi-urpg": { shipUpdate: updateRequest } } : undefined;
    await postRollCard(this.actor, {
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      publicContent,
      result: outcome.result,
      flags,
      actorIds: [outcome.target.id],
    });
  }
}
