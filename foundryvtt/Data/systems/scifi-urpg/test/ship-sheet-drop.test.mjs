import { test } from "node:test";
import assert from "node:assert/strict";

test("a crew-tab actor drop is accepted when Foundry delivers it to the sheet root", async () => {
  globalThis.ActorSheet = class {
    async _onDrop() { throw new Error("drop was delegated instead of assigned to crew"); }
  };
  globalThis.TextEditor = { getDragEventData: () => ({ type: "Actor", id: "gunner-1" }) };
  globalThis.game = {
    actors: new Map([["gunner-1", { id: "gunner-1", type: "character" }]]),
  };

  const { SciFiShipSheet } = await import(`../module/sheets/ship-sheet.mjs?test=${Date.now()}`);
  let updateData;
  const sheet = Object.create(SciFiShipSheet.prototype);
  sheet.actor = {
    system: { crew: { members: [] } },
    update: async (data) => { updateData = data; },
  };
  sheet.element = { find: () => [{ dataset: { tab: "crew" } }] };
  const event = { target: { closest: () => null } };

  await sheet._onDrop(event);

  assert.deepEqual(updateData, {
    "system.crew.members": [{ actorId: "gunner-1", pilot: false, gunner: false }],
  });
});

test("crew role checkboxes update one physical crew-member row", async () => {
  const { SciFiShipSheet } = await import(`../module/sheets/ship-sheet.mjs?test=${Date.now()}`);
  let updateData;
  const sheet = Object.create(SciFiShipSheet.prototype);
  sheet.actor = {
    system: { crew: { members: [
      { actorId: "crew-1", pilot: false, gunner: false },
      { actorId: "crew-1", pilot: false, gunner: false },
    ] } },
    update: async (data) => { updateData = data; },
  };

  await sheet._onToggleCrewRole({
    currentTarget: { dataset: { crewIndex: "1", crewRole: "pilot" }, checked: true },
  });

  assert.deepEqual(updateData, {
    "system.crew.members": [
      { actorId: "crew-1", pilot: false, gunner: false },
      { actorId: "crew-1", pilot: true, gunner: false },
    ],
  });
});

test("ship design editing stages changes until Done and then recalculates capacities", async () => {
  const { SciFiShipSheet } = await import(`../module/sheets/ship-sheet.mjs?test=${Date.now()}`);
  let updateData;
  const sheet = Object.create(SciFiShipSheet.prototype);
  sheet.actor = {
    system: {
      design: { mode: "standard", baseMark: "II", length: 60, tonnageOverride: null },
      hull: { value: 500 }, shields: { value: 500_000 }, energy: { value: 5_000_000 },
    },
    update: async (data) => { updateData = data; },
  };

  sheet._editingDesign = false;
  let renderCount = 0;
  sheet.render = () => { renderCount += 1; };
  sheet.submit = async () => {};
  const displayedValues = {};
  sheet.element = { find: (selector) => ({ val: (value) => { displayedValues[selector] = value; } }) };
  await sheet._onToggleDesignEdit({ preventDefault: () => {} });
  assert.equal(sheet._editingDesign, true);
  assert.equal(renderCount, 0);
  assert.equal(updateData, undefined);

  sheet._onPendingDesignLengthChange({ currentTarget: { value: "75" } });
  assert.equal(displayedValues["[data-field='design-tonnage-override']"], 30);
  assert.equal(sheet._pendingDesign.tonnageOverride, null);
  sheet._onPendingHullThicknessChange({ currentTarget: { value: "25" } });
  assert.equal(displayedValues["[data-field='design-hull-thickness']"], 25);
  assert.equal(sheet._pendingDesign.hullThicknessOverride, 25);
  await sheet._onToggleDesignEdit({ preventDefault: () => {} });
  assert.equal(updateData["system.design.mode"], "custom");
  assert.equal(updateData["system.design.baseMark"], "II");
  assert.equal(updateData["system.design.length"], 75);
  assert.equal(updateData["system.design.tonnageOverride"], null);
  assert.equal(updateData["system.design.hullThicknessOverride"], 25);
  // The special Mk-II design is 30 t: 300 hull BEP, 125,000 shield BEP, 2,500,000 kWs.
  assert.equal(updateData["system.hull.value"], undefined);
  assert.equal(updateData["system.shields.value"], 125_000);
  assert.equal(updateData["system.energy.value"], 2_500_000);
});

test("opening design edit toggles the existing controls without replacing their listeners", async () => {
  const { SciFiShipSheet } = await import(`../module/sheets/ship-sheet.mjs?test=${Date.now()}`);
  const sheet = Object.create(SciFiShipSheet.prototype);
  const state = {};
  const editor = { prop: (name, value) => { state[name] = value; } };
  const button = {
    toggleClass: (name, value) => { state.className = name; state.classValue = value; return button; },
    text: (value) => { state.text = value; return button; },
  };
  sheet.actor = { system: { design: { mode: "custom", baseMark: "II", length: 75, tonnageOverride: null } } };
  sheet._editingDesign = false;
  sheet.element = { find: (selector) => selector === ".ship-design-editor" ? editor : button };
  let renderCount = 0;
  sheet.render = () => { renderCount += 1; };

  await sheet._onToggleDesignEdit({ preventDefault: () => {} });

  assert.equal(renderCount, 0);
  assert.equal(state.hidden, false);
  assert.equal(state.className, "active");
  assert.equal(state.classValue, true);
  assert.equal(state.text, "Done");
});

test("Done saves a staged design without submitting an unchanged form again", async () => {
  const { SciFiShipSheet } = await import(`../module/sheets/ship-sheet.mjs?test=${Date.now()}`);
  const updates = [];
  const sheet = Object.create(SciFiShipSheet.prototype);
  sheet.actor = {
    system: {
      design: { mode: "standard", baseMark: "II", length: 60, tonnageOverride: null },
      hull: { value: 240 }, shields: { value: 100_000 }, energy: { value: 300_000 },
    },
    update: async (data) => { updates.push(data); },
  };
  sheet._editingDesign = true;
  sheet._pendingDesign = { ...sheet.actor.system.design, mode: "custom", length: 75 };
  sheet.render = () => {};
  sheet.submit = async () => { throw new Error("Done should not resubmit an unchanged form"); };

  await sheet._onToggleDesignEdit({ preventDefault: () => {} });

  assert.equal(updates[0]["system.design.length"], 75);
  assert.equal(updates[0]["system.hull.value"], undefined);
  assert.equal(updates[0]["system.shields.value"], 100_000);
  assert.equal(updates[0]["system.energy.value"], 300_000);

  await sheet._onToggleDesignEdit({ preventDefault: () => {} });
  await sheet._onToggleDesignEdit({ preventDefault: () => {} });
  assert.equal(sheet._editingDesign, false);
  assert.equal(updates.length, 2);
});

test("changing Mk refreshes the staged Length and Tonnage, and added weapons use those calculated values", async () => {
  const { SciFiShipSheet } = await import(`../module/sheets/ship-sheet.mjs?test=${Date.now()}`);
  const values = {};
  let created;
  const sheet = Object.create(SciFiShipSheet.prototype);
  sheet.actor = {
    system: { design: { mode: "standard", baseMark: "I", length: 40, tonnageOverride: null } },
    items: [],
    createEmbeddedDocuments: async (_type, documents) => { created = documents; },
  };
  sheet.element = { find: (selector) => ({ val: (value) => { values[selector] = value; } }) };

  sheet._onPendingDesignMarkChange({ currentTarget: { value: "II" } });
  assert.equal(values["[data-field='design-length']"], 60);
  assert.equal(values["[data-field='design-tonnage-override']"], 15);

  await sheet._onAddWeapon({ preventDefault: () => {} });
  assert.deepEqual(created, [{
    type: "shipWeapon", name: "Ship Weapon", img: "icons/weapons/artillery/missile.webp",
    flags: { "scifi-urpg": { shipUnitsVersion: 5 } },
      system: {},
  }]);
});

test("entering a numeric ship field selects its existing value", async () => {
  const { SciFiShipSheet } = await import(`../module/sheets/ship-sheet.mjs?test=${Date.now()}`);
  const sheet = Object.create(SciFiShipSheet.prototype);
  let selected = false;

  sheet._onSelectNumericInput({ currentTarget: { select: () => { selected = true; } } });

  assert.equal(selected, true);
});

test("ship firing sliders persist a five-step time dimension and whole-MWs energy", async () => {
  globalThis.ActorSheet = class {};
  const { SciFiShipSheet } = await import(`../module/sheets/ship-sheet.mjs?firing-slider-test=${Date.now()}`);
  const updates = [];
  const sheet = Object.create(SciFiShipSheet.prototype);
  sheet.actor = {
    system: {
      design: { gunMassOverride: 2.5 },
      firing: { timeDimension: 0, energyMws: 10 },
    },
    items: [],
    update: async (data) => { updates.push(data); },
  };

  await sheet._onAttackTimeDimensionChange({ currentTarget: { value: "7" } });
  sheet.actor.system.firing.timeDimension = 5;
  await sheet._onAttackEnergyChange({ currentTarget: { value: "13.8" } });
  sheet.actor.system.firing.energyMws = 13;
  await sheet._onAttackTimeNudge({ preventDefault: () => {}, currentTarget: { dataset: { delta: "5" } } });
  sheet.actor.system.firing.timeDimension = 10;
  await sheet._onAttackEnergyNudge({ preventDefault: () => {}, currentTarget: { dataset: { delta: "-1" } } });

  assert.deepEqual(updates, [
    { "system.firing.timeDimension": 5, "system.firing.energyMws": 20 },
    { "system.firing.energyMws": 13 },
    { "system.firing.timeDimension": 10, "system.firing.energyMws": 40 },
    { "system.firing.energyMws": 12 },
  ]);
});

test("ship Attack and Crew Roll controls provide actor-bound hotbar payloads", async () => {
  const { SciFiShipSheet } = await import(`../module/sheets/ship-sheet.mjs?macro-drag-test=${Date.now()}`);
  const sheet = Object.create(SciFiShipSheet.prototype);
  sheet.actor = { id: "ship-1" };
  const payloads = [];
  const dataTransfer = { setData: (_type, payload) => payloads.push(JSON.parse(payload)) };

  sheet._onDragRollMacro({
    currentTarget: { dataset: { macroAction: "shipCrewSkill", crewRole: "gunner" } },
    originalEvent: { dataTransfer },
  });

  globalThis.$ = () => ({ closest: () => ({ find: () => ({ val: () => "2" }) }) });
  sheet._onDragRollMacro({
    currentTarget: { dataset: { macroAction: "shipAttack" } },
    originalEvent: { dataTransfer },
  });

  assert.deepEqual(payloads, [
    { type: "scifi-urpg.roll", actorId: "ship-1", action: "shipCrewSkill", crewRole: "gunner" },
    {
      type: "scifi-urpg.roll", actorId: "ship-1", action: "shipAttack", bonus: 2,
    },
  ]);
});

test("crew skill rolls subtract and show the rounded ship damage penalty", async () => {
  const originalRandom = Math.random;
  Math.random = () => 0; // p5 rolls a 1, so n5 is 0.

  globalThis.foundry = { utils: { escapeHTML: (value) => String(value) } };
  globalThis.game = {
    actors: new Map([
      ["gunner-1", { id: "gunner-1", type: "character", name: "Ari", system: { skills: { Eingebettete: { value: 10 } }, health: { damage: 0 } } }],
      ["gunner-2", { id: "gunner-2", type: "character", name: "Bea", system: { skills: { Eingebettete: { value: 10 } }, health: { damage: 0 } } }],
    ]),
    settings: { get: () => "public" },
    user: { isGM: false },
  };
  const messages = [];
  globalThis.ChatMessage = {
    getSpeaker: () => ({ alias: "ship" }),
    create: async (message) => { messages.push(message); },
  };

  try {
    const { SciFiShipSheet } = await import(`../module/sheets/ship-sheet.mjs?test=${Date.now()}`);
    const sheet = Object.create(SciFiShipSheet.prototype);
    sheet.actor = {
      id: "ship-1",
      name: "Odyssey",
      hasPlayerOwner: true,
      system: {
        damage: 1.5,
        design: { tonnageOverride: 100 },
        crew: { members: [
          { actorId: "gunner-1", pilot: false, gunner: true },
          { actorId: "gunner-2", pilot: false, gunner: true },
        ] },
      },
    };
    sheet.submit = async () => {};

    await sheet._onRollCrewSkill({
      preventDefault: () => {},
      currentTarget: { dataset: { crewRole: "gunner" } },
    });

    assert.equal(messages.length, 1);
    assert.match(messages[0].content, /<h3>Eingebettete<\/h3>/);
    assert.match(messages[0].content, /15 \(Eingebettete\) − 2 \(damage\) \+ \(0 - 0\) \(n5\)/);
    assert.match(messages[0].content, /<div class="roll-result">13<\/div>/);
  } finally {
    Math.random = originalRandom;
  }
});

test("a GM's NPC crew roll shows players the result but not the crew skill", async () => {
  const originalRandom = Math.random;
  Math.random = () => 0; // p5 rolls a 1, so n5 is 0.

  globalThis.foundry = { utils: { escapeHTML: (value) => String(value) } };
  const messages = [];
  globalThis.game = {
    actors: new Map([
      ["gunner-1", { id: "gunner-1", type: "character", name: "Ari", system: { skills: { Eingebettete: { value: 10 } }, health: { damage: 0 } } }],
    ]),
    settings: { get: () => "public" },
    user: { isGM: true },
    users: [{ id: "gm", isGM: true }],
  };
  globalThis.ChatMessage = {
    getSpeaker: () => ({ alias: "ship" }),
    create: async (message) => { messages.push(message); },
  };

  try {
    const { SciFiShipSheet } = await import(`../module/sheets/ship-sheet.mjs?privacy-test=${Date.now()}`);
    const sheet = Object.create(SciFiShipSheet.prototype);
    sheet.actor = {
      id: "npc-ship",
      name: "NPC ship",
      hasPlayerOwner: false,
      system: { crew: { members: [{ actorId: "gunner-1", pilot: false, gunner: true }] } },
    };
    sheet.submit = async () => {};

    await sheet._onRollCrewSkill({
      preventDefault: () => {},
      currentTarget: { dataset: { crewRole: "gunner" } },
    });

    assert.equal(messages.length, 2);
    assert.doesNotMatch(messages[0].content, /roll-formula|10 \+ \(0 - 0\) \(n5\)/);
    assert.match(messages[0].content, /<div class="roll-result">10<\/div>/);
    assert.match(messages[1].content, /10 \+ \(0 - 0\) \(n5\)/);
    assert.deepEqual(messages[1].whisper, ["gm"]);
  } finally {
    Math.random = originalRandom;
  }
});

test("a GM's NPC ship attack shows players the outcome but not the attack formula", async () => {
  globalThis.foundry = { utils: { escapeHTML: (value) => String(value) } };
  const messages = [];
  globalThis.game = {
    settings: { get: () => "public" },
    user: { isGM: true },
    users: [{ id: "gm", isGM: true }],
  };
  globalThis.ChatMessage = {
    getSpeaker: () => ({ alias: "ship" }),
    create: async (message) => { messages.push(message); },
  };

  const { SciFiShipSheet } = await import(`../module/sheets/ship-sheet.mjs?attack-privacy-test=${Date.now()}`);
  const sheet = Object.create(SciFiShipSheet.prototype);
  sheet.actor = { id: "npc-ship", name: "NPC ship", hasPlayerOwner: false };

  await sheet._postAttackMessage({
    gunnery: 12,
    bonus: 2,
    rangePenalty: -20.726798901733616,
    distance: 10_960,
    evasion: 4,
    roll: { plus: 3, minus: 1 },
    weapon: { name: "Railgun" },
    target: { id: "target-ship", name: "Target" },
    result: 10,
    energyCost: 20,
    hit: false,
  });

  assert.equal(messages.length, 2);
  assert.doesNotMatch(messages[0].content, /roll-formula|12 \(Eingebettete\)|4 \(Raumfahrzeuge\)|\(3 - 1\) \(n5\)/);
  assert.match(messages[0].content, /<div class="roll-result">10\.0<\/div>/);
  assert.doesNotMatch(messages[0].content, /Miss: no damage/);
  assert.match(messages[1].content, /12 \(Eingebettete\).*\+ 2 \(Modifier\).*4 \(Raumfahrzeuge\).*\(3 - 1\) \(n5\)/s);
  assert.match(messages[1].content, /− 20\.7 \(range 11\.0 km\)/);
  assert.deepEqual(messages[1].whisper, ["gm"]);
});

test("ship attack cards omit zero-value effects after shields absorb a hit", async () => {
  globalThis.foundry = { utils: { escapeHTML: (value) => String(value) } };
  const messages = [];
  globalThis.game = {
    settings: { get: () => "public" },
    user: { isGM: true },
    users: [{ id: "gm", isGM: true }],
  };
  globalThis.ChatMessage = {
    getSpeaker: () => ({ alias: "ship" }),
    create: async (message) => { messages.push(message); },
  };

  const { SciFiShipSheet } = await import(`../module/sheets/ship-sheet.mjs?zero-damage-card-test=${Date.now()}`);
  const sheet = Object.create(SciFiShipSheet.prototype);
  sheet.actor = { id: "ship", name: "Attacker", hasPlayerOwner: true };

  await sheet._postAttackMessage({
    gunnery: 10,
    bonus: 0,
    rangePenalty: 0,
    distance: 1_000,
    evasion: 4,
    roll: { plus: 0, minus: 0 },
    weapon: { name: "Railgun" },
    target: { id: "target-ship", name: "Target" },
    result: 6,
    energyCost: 0,
    hit: true,
    rawDamage: 1_000,
    shieldDamage: 1_000,
    hullArmorDamage: 0,
    shipDamage: 0,
  });

  assert.match(messages[0].content, /Damage 1 kBEP: shields absorb 1 kBEP\./);
  assert.doesNotMatch(messages[0].content, /hull armor absorbs 0 BEP|ship takes 0 t damage/);
});

test("ship attack cards round damage displays and retain BEP for hull armor", async () => {
  globalThis.foundry = { utils: { escapeHTML: (value) => String(value) } };
  const messages = [];
  globalThis.game = {
    settings: { get: () => "public" },
    user: { isGM: true },
    users: [{ id: "gm", isGM: true }],
  };
  globalThis.ChatMessage = {
    getSpeaker: () => ({ alias: "ship" }),
    create: async (message) => { messages.push(message); },
  };

  const { SciFiShipSheet } = await import(`../module/sheets/ship-sheet.mjs?damage-rounding-card-test=${Date.now()}`);
  const sheet = Object.create(SciFiShipSheet.prototype);
  sheet.actor = { id: "ship", name: "Attacker", hasPlayerOwner: true };

  await sheet._postAttackMessage({
    gunnery: 10,
    bonus: 0,
    timeBonus: 10,
    rangePenalty: 0,
    distance: 1_000,
    evasion: 4,
    roll: { plus: 0, minus: 0 },
    weapon: { name: "Railgun" },
    target: { id: "target-ship", name: "Target" },
    result: 6,
    energyCost: 0,
    hit: true,
    rawDamage: 104_858,
    shieldDamage: 0,
    hullArmorDamage: 240,
    shipDamage: 104.618,
  });

  assert.match(messages[0].content, /\+ 10 \(duration\)/);
  assert.match(messages[0].content, /Damage 104\.9 kBEP: shields absorb 0 kBEP; hull armor absorbs 240 BEP; ship takes 104\.6 t damage\./);
});

test("ship attack formulas show non-zero structural-damage penalties", async () => {
  globalThis.foundry = { utils: { escapeHTML: (value) => String(value) } };
  const messages = [];
  globalThis.game = {
    settings: { get: () => "public" },
    user: { isGM: true },
    users: [{ id: "gm", isGM: true }],
  };
  globalThis.ChatMessage = {
    getSpeaker: () => ({ alias: "ship" }),
    create: async (message) => { messages.push(message); },
  };

  const { SciFiShipSheet } = await import(`../module/sheets/ship-sheet.mjs?damage-formula-test=${Date.now()}`);
  const sheet = Object.create(SciFiShipSheet.prototype);
  sheet.actor = { id: "ship", name: "Attacker", hasPlayerOwner: true };

  await sheet._postAttackMessage({
    gunneryBeforeDamage: 12,
    attackerDamage: 1.54,
    gunnery: 10.5,
    bonus: 0,
    rangePenalty: 0,
    distance: 1_000,
    evasionBeforeDamage: 8,
    defenderDamage: 2.25,
    evasion: 5.75,
    roll: { plus: 0, minus: 0 },
    weapon: { name: "Railgun" },
    target: { id: "target-ship", name: "Target" },
    result: 4.75,
    energyCost: 0,
    hit: false,
  });

  assert.match(messages[0].content, /12 \(Eingebettete\) − 2 \(damage\).*− 8 \(Raumfahrzeuge\) \+ 2 \(damage\)/s);
});
