import { actorNameElement, postRollCard } from "../chat.mjs";
import { distanceToTarget } from "../rules/distance.mjs";
import {
  applyShipAcceleration,
  convertDilithium,
  generateReactorEnergy,
  rechargeShields,
  resolveShipAttack,
} from "../rules/ship-combat.mjs";
import { n5Formula } from "../rules/dice.mjs";

function number(value) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
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
        accuracy: number(item.system.accuracy),
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
    html.find("[data-action='attack-target']").on("click", this._onAttackTarget.bind(this));
    html.find("[data-field='attack-bonus']").on("input change", this._onAttackBonusChange.bind(this));
    html.find("[data-action='select-weapon']").on("click", this._onSelectWeapon.bind(this));
    html.find("[data-action='add-weapon']").on("click", this._onAddWeapon.bind(this));
    html.find("[data-action='edit-weapon']").on("click", this._onEditWeapon.bind(this));
    html.find("[data-action='delete-weapon']").on("click", this._onDeleteWeapon.bind(this));
    html.find("[data-action='recharge-shields']").on("click", this._onRechargeShields.bind(this));
    html.find("[data-action='generate-reactor-energy']").on("click", this._onGenerateReactorEnergy.bind(this));
    html.find("[data-action='convert-dilithium']").on("click", this._onConvertDilithium.bind(this));
    html.find("[data-field='dilithium-conversion']").on("input change", this._onDilithiumConversionChange.bind(this));
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

  async _onDeleteCrewMember(event) {
    event.preventDefault();
    const index = Number(event.currentTarget.dataset.crewIndex);
    if (!Number.isInteger(index) || index < 0) return;
    const members = [...(this.actor.system.crew?.members ?? [])];
    members.splice(index, 1);
    await this.actor.update({ "system.crew.members": members });
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

    const outcome = resolveShipAttack({
      attacker: this.actor,
      target,
      weapon,
      crewMembers,
      targetCrewMembers: resolvedCrewMembers(target),
      bonus: this._attackBonus,
      distance,
    });
    await game.scifiUrpg.updateShip(target, outcome.updateData, {
      token: targetToken,
      beforeApply: (updateRequest) => this._postAttackMessage(outcome, { updateRequest }),
    });
  }

  async _onAddWeapon(event) {
    event.preventDefault();
    await this.actor.createEmbeddedDocuments("Item", [{
      type: "shipWeapon",
      name: "Ship Weapon",
      img: "icons/weapons/artillery/missile.webp",
    }]);
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
      outcome.weaponBonus ? `${outcome.weaponBonus >= 0 ? "+" : "−"} ${Math.abs(outcome.weaponBonus)}` : null,
      outcome.rangePenalty ? `${outcome.rangePenalty >= 0 ? "+" : "−"} ${Math.abs(outcome.rangePenalty)}` : null,
      `− ${outcome.evasion} (Raumfahrzeuge)`,
      // Keep the random roll last so the deterministic comparison is easy to read.
      `+ ${n5Formula(outcome.roll, { leadingPlus: false })}`,
    ].filter(Boolean).join(" ");
    const weaponName = foundry.utils.escapeHTML(outcome.weapon?.name ?? "ship weapon");
    const damage = outcome.hit
      ? `<p>BEP ${outcome.rawDamage}: shields absorb ${outcome.shieldDamage}; hull takes ${outcome.hullDamage}.</p>`
      : "<p>Miss: no damage.</p>";
    const content = `
      <div class="scifi-urpg-chat-card attack-card">
        <h3>Eingebettete</h3>
        <p>${actorNameElement(this.actor)} attacks ${actorNameElement(outcome.target)} with ${weaponName}</p>
        <div class="roll-formula">${foundry.utils.escapeHTML(formula)}</div>
        <div class="roll-result">${outcome.result.toFixed(1)}</div>
        ${damage}
      </div>`;
    const publicContent = content;
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
