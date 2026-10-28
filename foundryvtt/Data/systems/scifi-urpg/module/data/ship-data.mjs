const fields = foundry.data.fields;

export class ShipDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      mark: new fields.StringField({ initial: "I", choices: ["I", "II", "III", "IV", "V"] }),
      mass: new fields.NumberField({ initial: 4, min: 0, required: true }),
      hull: new fields.SchemaField({
        value: new fields.NumberField({ initial: 20, min: 0, required: true }),
        max: new fields.NumberField({ initial: 20, min: 1, required: true }),
      }),
      shields: new fields.SchemaField({
        value: new fields.NumberField({ initial: 10, min: 0, required: true }),
        max: new fields.NumberField({ initial: 10, min: 0, required: true }),
      }),
      energy: new fields.SchemaField({
        value: new fields.NumberField({ initial: 4000, min: 0, required: true }),
        max: new fields.NumberField({ initial: 4000, min: 0, required: true }),
      }),
      reactor: new fields.SchemaField({
        output: new fields.NumberField({ initial: 100, min: 0, required: true }),
      }),
      dilithium: new fields.NumberField({ initial: 0, min: 0, required: true }),
      movement: new fields.SchemaField({
        velocityX: new fields.NumberField({ initial: 0, required: true }),
        velocityY: new fields.NumberField({ initial: 0, required: true }),
      }),
      crew: new fields.SchemaField({
        gunners: new fields.ArrayField(new fields.StringField(), { initial: [] }),
      }),
      weapon: new fields.SchemaField({
        selected: new fields.StringField({ required: true, nullable: false, initial: "" }),
      }),
      notes: new fields.StringField({ required: false, nullable: false, blank: true, initial: "" }),
    };
  }

  prepareBaseData() {
    this.hull.max = Math.max(1, this.hull.max);
    this.hull.value = Math.min(this.hull.max, Math.max(0, this.hull.value));
    this.shields.value = Math.min(Math.max(0, this.shields.max), Math.max(0, this.shields.value));
    this.energy.value = Math.min(Math.max(0, this.energy.max), Math.max(0, this.energy.value));
  }
}

export class ShipWeaponDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new fields.HTMLField({ required: false, nullable: false, initial: "" }),
      damage: new fields.NumberField({ initial: 1, min: 0, required: true }),
      accuracy: new fields.NumberField({ initial: 0, required: true }),
      rangeModifier: new fields.NumberField({ initial: 0, required: true }),
    };
  }
}
