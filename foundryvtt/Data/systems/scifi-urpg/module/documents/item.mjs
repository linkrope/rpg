const DEFAULT_WEAPON_IMAGE = "icons/svg/sword.svg";

export class SciFiItem extends Item {
  _preCreate(data, options, user) {
    super._preCreate(data, options, user);

    if (this.type !== "weapon") return;

    // The sidebar supplies the generic item-bag image for new Items. Replace
    // only that default, leaving a GM-selected image untouched.
    if (!data.img || data.img === "icons/svg/item-bag.svg") {
      this.updateSource({ img: DEFAULT_WEAPON_IMAGE });
    }
  }
}
