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
    return context;
  }
}
