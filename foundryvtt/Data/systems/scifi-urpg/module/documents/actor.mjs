import { calculateShipSpecification, standardShipDesign } from "../rules/ship-design.mjs";
import { starterShipWeaponSource } from "../constants.mjs";

export class SciFiActor extends Actor {
  async toggleStatusEffect(statusId, options = {}) {
    if (this.type === "character" && statusId === "unconscious") {
      const active = options.active ?? !this.statuses?.has?.(statusId);
      return super.toggleStatusEffect(statusId, { ...options, active, overlay: active });
    }

    return super.toggleStatusEffect(statusId, options);
  }

  _preCreate(data, options, user) {
    super._preCreate(data, options, user);

    if (this.type === "ship") {
      const suppliedSystem = data.system ?? {};
      const design = suppliedSystem.design ?? standardShipDesign(suppliedSystem.mark ?? this.system.mark);
      const specification = calculateShipSpecification(design);
      this.updateSource({
        "system.design": design,
        "system.mark": design.baseMark,
        "flags.scifi-urpg.shipUnitsVersion": 5,
        "system.shields.value": specification.shieldCapacityBep,
        "system.energy.value": specification.batteryCapacityKws,
      });
      const items = Array.isArray(data.items) ? data.items : (this._source.items ?? []);
      if (!items.some((item) => item.type === "shipWeapon")) {
        this.updateSource({ items: [...items, starterShipWeaponSource()] });
      }
      this.updateSource({
        "prototypeToken.actorLink": true,
        "prototypeToken.bar1.attribute": "damageBar",
        "prototypeToken.bar2.attribute": "shields",
        // Ship illustrations are drawn in landscape. Rotate their token so a
        // right-facing sprite points south on the tactical map by default.
        "prototypeToken.rotation": 90,
        "prototypeToken.displayName": CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
        "prototypeToken.displayBars": CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER
      });
      return;
    }

    if (this.type !== "character") return;

    this.updateSource({
      "prototypeToken.actorLink": true,
      "prototypeToken.bar1.attribute": "health",
      "prototypeToken.bar2.attribute": null,
      "prototypeToken.displayName": CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
      "prototypeToken.displayBars": CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER
    });
  }

  prepareBaseData() {
    super.prepareBaseData();

    if (this.type !== "character") return;

    const system = this.system;
    system.health.max = 20;
    system.health.damage = Math.max(0, Math.round(system.health.damage ?? 0));
    // Bar 1 is a fixed 20-point damage scale; damage itself has no ceiling.
    system.health.value = system.health.damage;
  }

}
