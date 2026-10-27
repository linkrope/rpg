export const SKILL_COLUMNS = {
  Allgemein: [
    { group: "Feinmotorik", skills: ["Feinmechanik", "Gerätegebrauch", "Instrument spielen"] },
    { group: "Grobmotorik", skills: ["Klettern", "Rennen", "Stärke"] },
    { group: "Heimlichkeit", skills: ["Schleichen", "Unverdächtig", "Verstecken"] },
    { group: "Intelligenz", skills: ["Verständnis", "Vorhersage", "Wissen"] },
    { group: "Soziales", skills: ["Empathie", "Höflichkeit", "Redner"] },
    { group: "Wahrnehmung", skills: ["Aufmerksamkeit", "Beobachten", "Initiative"] }
  ],
  Speziell: [
    { group: "Ingenieurswesen", skills: ["Computer", "Raumfahrt", "Fahrzeuge", "Chemie"] },
    { group: "Medizin", skills: ["Erste Hilfe", "Diagnosen", "Therapien"] },
    { group: "Basteln", skills: ["Elektronik", "Gadgets", "Ersatzteile"] },
    { group: "Fahrzeuge lenken", skills: ["Kleinfahrzeuge", "Großfahrzeuge", "Raumfahrzeuge"] },
    { group: "Fernkampfwaffen", skills: ["Bögen", "Geschosswaffen", "Energiewaffen"] },
    { group: "Nahkampfwaffen", skills: ["Waffenlos", "Kurzwaffen", "Langwaffen"] },
    { group: "Artillerie", skills: ["Tragbare", "Montierte", "Eingebettete"] },
    { group: "Wirtschaften", skills: ["Bilanz", "Energie", "Logistik"] }
  ]
};

export const DISPLAY_NAME_OVERRIDES = {
  "Instrument spielen": "Instrument"
};

export const SKILL_KEYS = Object.values(SKILL_COLUMNS)
  .flat()
  .flatMap((group) => group.skills);

export const SKILL_COLUMN_BY_KEY = Object.fromEntries(
  Object.entries(SKILL_COLUMNS).flatMap(([column, groups]) =>
    groups.flatMap((group) => group.skills.map((skill) => [skill, column]))
  )
);

export const SKILL_GROUP_BY_KEY = Object.fromEntries(
  Object.values(SKILL_COLUMNS).flatMap((groups) =>
    groups.flatMap((group) => group.skills.map((skill) => [skill, group.group]))
  )
);

export const BASE_HIT_ZONE_PCT = {
  torso: 40,
  legs: 30,
  arms: 20,
  head: 10
};

export const RUESTUNGSEFFEKT = {
  geschosswaffe: 5,
  kurzwaffe: 10,
  langwaffe: 25,
  energiewaffe: 5
};

export const SKILL_TO_RUESTUNGSEFFEKT = {
  Waffenlos: "kurzwaffe",
  Kurzwaffen: "kurzwaffe",
  Langwaffen: "langwaffe",
  "Bögen": "geschosswaffe",
  Geschosswaffen: "geschosswaffe",
  Energiewaffen: "energiewaffe",
  Tragbare: "langwaffe",
  Montierte: "langwaffe",
  Eingebettete: "langwaffe"
};

export const ARMOR_ZONE_DEFS = [
  { key: "head", label: "HEAD", color: "#dc322f" },
  { key: "arms", label: "ARMS", color: "#2aa198" },
  { key: "torso", label: "TORSO", color: "#268bd2" },
  { key: "legs", label: "LEGS", color: "#859900" }
];

export const ARMOR_MATERIALS = {
  cloth: { label: "Cloth", bep: 1, lossNum: 1, lossDenom: 1 },
  leather: { label: "Leather", bep: 3, lossNum: 2, lossDenom: 3 },
  plasteel: { label: "Plasteel", bep: 12, lossNum: 3, lossDenom: 12 },
  glas: { label: "Glas", bep: 8, lossNum: 2, lossDenom: 8 },
  metal: { label: "Metal", bep: 12, lossNum: 1, lossDenom: 24 }
};

export const SCI_FI = {
  SKILL_COLUMNS,
  DISPLAY_NAME_OVERRIDES,
  SKILL_KEYS,
  SKILL_COLUMN_BY_KEY,
  SKILL_GROUP_BY_KEY,
  BASE_HIT_ZONE_PCT,
  RUESTUNGSEFFEKT,
  SKILL_TO_RUESTUNGSEFFEKT,
  ARMOR_ZONE_DEFS,
  ARMOR_MATERIALS
};

export function displaySkillName(key) {
  return DISPLAY_NAME_OVERRIDES[key] ?? key;
}

export function stepCostForLevel(level) {
  if (level <= 0) return 0;
  return Math.ceil(level / 10);
}

export function skillChangeCost(fromValue, toValue) {
  if (fromValue === toValue) return 0;

  let cost = 0;
  if (toValue > fromValue) {
    for (let level = fromValue + 1; level <= toValue; level += 1) {
      cost += stepCostForLevel(level);
    }
    return cost;
  }

  for (let level = fromValue; level >= toValue + 1; level -= 1) {
    cost -= stepCostForLevel(level);
  }
  return cost;
}

export function fmtArmor(value) {
  const n = Math.round((value || 0) * 10) / 10;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function buildSkillColumns(skills = {}) {
  return Object.entries(SKILL_COLUMNS).map(([column, groups]) => ({
    column,
    groups: groups.map((group) => ({
      group: group.group,
      skills: group.skills.map((key) => ({
        key,
        label: displaySkillName(key),
        value: skills[key]?.value ?? 0,
        column,
        group: group.group
      }))
    }))
  }));
}

export function buildArmorZones(armor = {}) {
  return ARMOR_ZONE_DEFS.map((zone) => {
    const data = armor[zone.key] ?? {};
    const material = data.material ?? "";

    return {
      ...zone,
      material,
      value: data.value ?? 0,
      battered: data.battered ?? 0,
      displayValue: fmtArmor(data.value ?? 0),
      displayBattered: fmtArmor(data.battered ?? 0),
      materialLabel: material ? ARMOR_MATERIALS[material]?.label ?? material : "No armor"
    };
  });
}

export function buildArmorMaterials(activeMaterial = "") {
  return Object.entries(ARMOR_MATERIALS).map(([key, def]) => ({
    key,
    label: def.label,
    bep: def.bep,
    active: activeMaterial === key,
    lossText: `Loss ${def.lossNum}/${def.lossDenom}`
  }));
}
