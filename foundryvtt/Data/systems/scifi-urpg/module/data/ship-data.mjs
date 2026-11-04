import { calculateShipSpecification, SHIP_PROFILES, standardShipDesign } from "../rules/ship-design.mjs";

const fields = foundry.data.fields;

export class ShipDataModel extends foundry.abstract.TypeDataModel {
  static migrateData(source) {
    // Only old, complete ship records have a Mk but no design object. Never
    // infer a design from a partial update: such updates contain operational
    // fields (for example battery charge) and must not replace a custom ship.
    if (source.design === undefined && source.mark !== undefined) {
      source.design = standardShipDesign(SHIP_PROFILES[source.mark] ? source.mark : "I");
    }
    return super.migrateData(source);
  }

  static defineSchema() {
    return {
      // `mark` is retained for existing worlds and older macros. New rules use
      // design.baseMark, which remains locked once a ship is customised.
      mark: new fields.StringField({ initial: "I", choices: ["I", "II", "III", "IV", "V"] }),
      design: new fields.SchemaField({
        mode: new fields.StringField({ initial: "standard", choices: ["standard", "custom"] }),
        baseMark: new fields.StringField({ initial: "I", choices: ["I", "II", "III", "IV", "V"] }),
        length: new fields.NumberField({ initial: 40, min: 0, required: true }),
        tonnageOverride: new fields.NumberField({ initial: null, min: 0, nullable: true, required: false }),
        hullThicknessOverride: new fields.NumberField({ initial: null, min: 1, nullable: true, required: false }),
        batteryMassOverride: new fields.NumberField({ initial: null, min: 0, nullable: true, required: false }),
        generatorMassOverride: new fields.NumberField({ initial: null, min: 0, nullable: true, required: false }),
        shieldMassOverride: new fields.NumberField({ initial: null, min: 0, nullable: true, required: false }),
        gunMassOverride: new fields.NumberField({ initial: null, min: 0, nullable: true, required: false }),
      }),
      mass: new fields.NumberField({ initial: 4, min: 0, required: true }),
      hull: new fields.SchemaField({
        value: new fields.NumberField({ initial: 20, min: 0, required: true }),
        max: new fields.NumberField({ initial: 20, min: 1, required: true }),
      }),
      shields: new fields.SchemaField({
        value: new fields.NumberField({ initial: 10_000, min: 0, required: true }),
        max: new fields.NumberField({ initial: 10_000, min: 0, required: true }),
      }),
      energy: new fields.SchemaField({
        value: new fields.NumberField({ initial: 4_000_000, min: 0, required: true }),
        max: new fields.NumberField({ initial: 4_000_000, min: 0, required: true }),
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
        members: new fields.ArrayField(new fields.SchemaField({
          actorId: new fields.StringField({ required: true, nullable: false, initial: "" }),
          pilot: new fields.BooleanField({ required: true, nullable: false, initial: false }),
          gunner: new fields.BooleanField({ required: true, nullable: false, initial: false }),
        }), { initial: [] }),
      }),
      weapon: new fields.SchemaField({
        selected: new fields.StringField({ required: true, nullable: false, initial: "" }),
      }),
      notes: new fields.StringField({ required: false, nullable: false, blank: true, initial: "" }),
    };
  }

  prepareBaseData() {
    // Source maxima can predate the calculated design values. Only ensure
    // current values are non-negative here; cap them after the design has
    // supplied its real capacities in prepareDerivedData.
    this.hull.value = Math.max(0, this.hull.value);
    this.shields.value = Math.max(0, this.shields.value);
    this.energy.value = Math.max(0, this.energy.value);
  }

  prepareDerivedData() {
    const specification = calculateShipSpecification(this.design);
    this.mass = specification.tonnage;
    this.hull.max = specification.hullProtection;
    this.shields.max = specification.shieldCapacityBep;
    this.energy.max = specification.batteryCapacityKws;
    this.reactor.output = specification.generatorOutput;

    // Changing a design never repairs a vessel or creates charge. Clamp its
    // operational state to the newly calculated capacities instead.
    this.hull.value = Math.min(this.hull.max, Math.max(0, this.hull.value));
    this.shields.value = Math.min(this.shields.max, Math.max(0, this.shields.value));
    this.energy.value = Math.min(this.energy.max, Math.max(0, this.energy.value));
  }
}

export class ShipWeaponDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new fields.HTMLField({ required: false, nullable: false, initial: "" }),
      bep: new fields.NumberField({ initial: 1_000, min: 0, required: true }),
      energy: new fields.NumberField({ initial: 0, min: 0, required: true }),
      rangeModifier: new fields.NumberField({ initial: 0, required: true }),
    };
  }
}
