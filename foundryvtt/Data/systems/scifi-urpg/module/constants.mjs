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

export const WEAPON_OPTIONS = [
  "Unarmed",
  "Short Weapon",
  "Long Weapon",
  "Bow",
  "Light Gun",
  "Heavy Gun",
  "Light Rifle",
  "Heavy Rifle",
  "Mounted Machine Gun",
  "Carried Grenade Launcher",
  "Energy Blaster Mk I",
  "Energy Blaster Mk II",
  "Energy Blaster Mk III"
];

export const WEAPON_PRESETS = [
  { name: "Unarmed", skill: "Waffenlos", weight: null, hand: 2, bep: 2, range: null, rate: "4s", clip: null, ammo: null, nozzle: null },
  { name: "Short Weapon", skill: "Kurzwaffen", weight: "300g", hand: 1, bep: 5, range: "5m", rate: "4s", clip: null, ammo: null, nozzle: null },
  { name: "Long Weapon", skill: "Langwaffen", weight: "1.3kg", hand: 1, bep: 7, range: "5m", rate: "4s", clip: null, ammo: "1.3kg", nozzle: "6m/s" },
  { name: "Bow", skill: "Bögen", weight: "1.5kg", hand: 2, bep: 8, range: "20m", rate: "6s", clip: 20, ammo: "80g", nozzle: "100m/s" },
  { name: "Light Gun", skill: "Geschosswaffen", weight: "1kg", hand: 1, bep: 6, range: "20m", rate: "2s", clip: 20, ammo: "10g", nozzle: "600m/s" },
  { name: "Heavy Gun", skill: "Geschosswaffen", weight: "2kg", hand: 1, bep: 18, range: "20m", rate: "3s", clip: 10, ammo: "20g", nozzle: "900m/s" },
  { name: "Light Rifle", skill: "Geschosswaffen", weight: "4kg", hand: 2, bep: 12, range: "40m", rate: "2s", clip: 30, ammo: "20g", nozzle: "600m/s" },
  { name: "Heavy Rifle", skill: "Geschosswaffen", weight: "6kg", hand: 2, bep: 24, range: "40m", rate: "4s", clip: 20, ammo: "40g", nozzle: "600m/s" },
  { name: "Mounted Machine Gun", skill: "Montierte", weight: "25kg", hand: 2, bep: 36, range: "40m", rate: "1s", clip: 120, ammo: "40g", nozzle: "900m/s" },
  { name: "Carried Grenade Launcher", skill: "Tragbare", weight: "3kg", hand: 2, bep: 50, range: "40m", rate: "12s", clip: 1, ammo: "500g", nozzle: "100m/s" },
  { name: "Energy Blaster Mk I", skill: "Energiewaffen", weight: "2.5kg", hand: 2, bep: 10, range: "50m", rate: "1s", clip: 250, ammo: "250g", nozzle: "Light" },
  { name: "Energy Blaster Mk II", skill: "Energiewaffen", weight: "5kg", hand: 2, bep: 20, range: "50m", rate: "1s", clip: 1000, ammo: "1kg", nozzle: "Light" },
  { name: "Energy Blaster Mk III", skill: "Energiewaffen", weight: "10kg", hand: 2, bep: 40, range: "50m", rate: "1s", clip: 2000, ammo: "2kg", nozzle: "Light" }
];

export const COMBAT_SKILL_GROUPS = [
  { group: "Fernkampfwaffen", skills: ["Bögen", "Geschosswaffen", "Energiewaffen"] },
  { group: "Nahkampfwaffen", skills: ["Waffenlos", "Kurzwaffen", "Langwaffen"] },
  { group: "Artillerie", skills: ["Tragbare", "Montierte", "Eingebettete"] }
];

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
  WEAPON_OPTIONS,
  WEAPON_PRESETS,
  COMBAT_SKILL_GROUPS,
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
