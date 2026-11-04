import { bepToKBep, kBepToBep, kwsToMws, mwsToKws } from "../rules/ship-units.mjs";

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
    context.bepDisplay = bepToKBep(this.item.system.bep);
    context.energyDisplay = kwsToMws(this.item.system.energy);
    return context;
  }

  async _updateObject(event, formData) {
    const updateData = foundry.utils.deepClone(formData);
    if (updateData["system.bep"] !== undefined) updateData["system.bep"] = kBepToBep(updateData["system.bep"]);
    if (updateData["system.energy"] !== undefined) updateData["system.energy"] = mwsToKws(updateData["system.energy"]);
    return this.item.update(updateData);
  }
}
