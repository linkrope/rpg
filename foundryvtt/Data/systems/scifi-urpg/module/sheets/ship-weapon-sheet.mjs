import { bepToKBep, kwsToMws } from "../rules/ship-units.mjs";
import { shipWeaponOutput } from "../rules/ship-combat.mjs";

export class SciFiShipWeaponSheet extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["scifi-urpg", "sheet", "item", "ship-weapon"],
      template: "systems/scifi-urpg/templates/item/ship-weapon-sheet.hbs",
      width: 460,
      height: "auto",
    });
  }

  get template() {
    return "systems/scifi-urpg/templates/item/ship-weapon-sheet.hbs";
  }

  async getData(options = {}) {
    const context = await super.getData(options);
    context.system = this.item.system;
    const ship = this.item.parent?.type === "ship" ? this.item.parent : null;
    const output = shipWeaponOutput(ship);
    context.bepDisplay = bepToKBep(output.damage);
    context.energyDisplay = kwsToMws(output.energy);
    return context;
  }

  async _updateObject(event, formData) {
    return this.item.update(foundry.utils.deepClone(formData));
  }
}
