import { ARMOR_MATERIALS, SKILL_COLUMN_BY_KEY, SKILL_GROUP_BY_KEY, SKILL_KEYS } from "../constants.mjs";

const fields = foundry.data.fields;

function skillSchema(key) {
  return new fields.SchemaField({
    value: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0 }),
    column: new fields.StringField({ required: true, nullable: false, initial: SKILL_COLUMN_BY_KEY[key] }),
    group: new fields.StringField({ required: true, nullable: false, initial: SKILL_GROUP_BY_KEY[key] })
  });
}

function skillsSchema() {
  return new fields.SchemaField(
    Object.fromEntries(SKILL_KEYS.map((key) => [key, skillSchema(key)]))
  );
}

export class CharacterDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      tokenType: new fields.StringField({ required: false, nullable: false, initial: "" }),
      propertyType: new fields.StringField({ required: false, nullable: false, initial: "" }),
      notes: new fields.StringField({ required: false, nullable: false, blank: true, initial: "" }),
      health: new fields.SchemaField({
        value: new fields.NumberField({ required: true, nullable: false, initial: 20, min: 0, max: 20 }),
        max: new fields.NumberField({ required: true, nullable: false, initial: 20, min: 1 }),
        damage: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0, max: 20 })
      }),
      skillPoints: new fields.SchemaField({
        Allgemein: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0 }),
        Speziell: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0 })
      }),
      skills: skillsSchema(),
      weapon: new fields.SchemaField({
        selected: new fields.StringField({ required: true, nullable: false, initial: "Unarmed" })
      }),
      talents: new fields.ArrayField(new fields.SchemaField({
        name: new fields.StringField({ required: true, nullable: false, initial: "" }),
        rank: new fields.NumberField({ required: false, nullable: true, integer: true, initial: null, min: 0 }),
        description: new fields.StringField({ required: false, nullable: false, blank: true, initial: "" })
      }), { initial: [] }),
      armor: new fields.SchemaField({
        torso: armorZoneSchema(),
        legs: armorZoneSchema(),
        arms: armorZoneSchema(),
        head: armorZoneSchema()
      })
    };
  }

  static migrateData(source) {
    if (source.skills) {
      for (const key of SKILL_KEYS) {
        const current = source.skills[key];
        if (current === undefined) continue;

        const value = typeof current === "number" ? current : current?.value;
        source.skills[key] = {
          value: Number.isFinite(Number(value)) ? Math.max(0, Math.round(Number(value))) : 0,
          column: SKILL_COLUMN_BY_KEY[key],
          group: SKILL_GROUP_BY_KEY[key]
        };
      }
    }

    if (typeof source.health === "number") {
      const health = Math.max(0, Math.min(1, source.health));
      source.health = {
        value: Math.round(health * 20),
        max: 20,
        damage: Math.round((1 - health) * 20)
      };
    }

    if (source.talents) {
      source.talents = source.talents.map((talent) => ({
        name: talent?.name ?? "",
        rank: Number.isFinite(Number(talent?.rank)) && Number(talent.rank) > 0 ? Math.round(Number(talent.rank)) : null,
        description: talent?.description || ""
      }));
    }

    if (source.armor) {
      for (const zone of ["torso", "legs", "arms", "head"]) {
        if (!source.armor[zone]) continue;

        const armor = source.armor[zone];
        const normalized = {};

        if ("material" in armor) {
          normalized.material = armor.material && ARMOR_MATERIALS[armor.material] ? armor.material : null;
        }

        if ("value" in armor) {
          normalized.value = Number.isFinite(Number(armor.value)) ? Math.max(0, Number(armor.value)) : 0;
        }

        if ("battered" in armor) {
          normalized.battered = Number.isFinite(Number(armor.battered)) ? Math.max(0, Number(armor.battered)) : 0;
        }

        source.armor[zone] = normalized;
      }
    }

    return super.migrateData(source);
  }

  prepareBaseData() {
    this.health.max = Math.max(1, Math.round(this.health.max ?? 20));
    this.health.damage = Math.max(0, Math.min(this.health.max, Math.round(this.health.damage ?? 0)));
    this.health.value = Math.max(0, this.health.max - this.health.damage);
  }
}

export class GenericItemDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      description: new fields.HTMLField({ required: false, nullable: false, initial: "" })
    };
  }
}

function armorZoneSchema() {
  return new fields.SchemaField({
    material: new fields.StringField({ required: false, nullable: true, initial: null }),
    value: new fields.NumberField({ required: true, nullable: false, initial: 0, min: 0 }),
    battered: new fields.NumberField({ required: true, nullable: false, initial: 0, min: 0 })
  });
}
