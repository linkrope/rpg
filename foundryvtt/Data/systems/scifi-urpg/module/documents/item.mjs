const DEFAULT_WEAPON_IMAGE = "icons/svg/sword.svg";
const DEFAULT_SHIP_WEAPON_IMAGE = "icons/weapons/artillery/missile.webp";

export class SciFiItem extends Item {
  _preCreate(data, options, user) {
    super._preCreate(data, options, user);

    if (this.type === "shipWeapon") {
      if (!data.img || data.img === "icons/svg/item-bag.svg") this.updateSource({ img: DEFAULT_SHIP_WEAPON_IMAGE });
      return;
    }

    if (this.type !== "weapon") return;

    // The sidebar supplies the generic item-bag image for new Items. Replace
    // only that default, leaving a GM-selected image untouched.
    if (!data.img || data.img === "icons/svg/item-bag.svg") {
      this.updateSource({ img: DEFAULT_WEAPON_IMAGE });
    }
  }
}
