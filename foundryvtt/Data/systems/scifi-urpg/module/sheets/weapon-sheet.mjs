import { COMBAT_SKILL_GROUPS, displaySkillName } from "../constants.mjs";

export class SciFiWeaponSheet extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["scifi-urpg", "sheet", "item", "weapon"],
      template: "systems/scifi-urpg/templates/item/weapon-sheet.hbs",
      width: 520,
      height: "auto"
    });
  }

  get template() {
    return "systems/scifi-urpg/templates/item/weapon-sheet.hbs";
  }

  async getData(options = {}) {
    const context = await super.getData(options);
    context.system = this.item.system;
    context.skillGroups = COMBAT_SKILL_GROUPS.map(({ group, skills }) => ({
      group: group.toUpperCase(),
      skills: skills.map((key) => ({
        key,
        label: displaySkillName(key),
        selected: this.item.system.skill === key
      }))
    }));
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("input[type='text'], input[type='number'], textarea").on("focus", (event) => {
      event.currentTarget.select();
    });
    html.find("[data-action='pick-image']").on("click", this._onPickImage.bind(this));
  }

  _onPickImage(event) {
    event.preventDefault();
    const FilePickerClass = foundry.applications?.apps?.FilePicker ?? globalThis.FilePicker;
    if (!FilePickerClass) return;

    new FilePickerClass({
      type: "image",
      // Start in the Core Data icon directory rather than resolving the
      // item's current image against the User Data source.
      current: "icons",
      activeSource: "public",
      callback: (path) => this.item.update({ img: path })
    }).render(true);
  }
}
