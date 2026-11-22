import { test } from "node:test";
import assert from "node:assert/strict";

test("a newly created ship with Foundry defaults starts as the selected standard design", async () => {
  globalThis.Actor = class { _preCreate() {} };
  globalThis.CONST = { TOKEN_DISPLAY_MODES: { OWNER_HOVER: 50 } };
  const { SciFiActor } = await import(`../module/documents/actor.mjs?test=${Date.now()}`);
  const updates = [];
  const ship = Object.create(SciFiActor.prototype);
  ship.type = "ship";
  ship.system = { design: { mode: "standard", baseMark: "I" }, mark: "I" };
  ship._source = { items: [] };
  ship.updateSource = (update) => { updates.push(update); };

  ship._preCreate({ system: {
    mark: "II", mass: 4, hull: {}, shields: {}, energy: {}, reactor: {},
  } }, {}, "user");

  assert.deepEqual(updates.find((update) => update["system.design"])["system.design"], {
    mode: "standard", baseMark: "II", length: 60, tonnageOverride: null, hullThicknessOverride: null,
    batteryMassOverride: null, generatorMassOverride: null, shieldMassOverride: null, gunMassOverride: null,
  });
  assert.equal(updates.find((update) => update["prototypeToken.rotation"])["prototypeToken.rotation"], 90);
  assert.equal(updates.find((update) => update["prototypeToken.bar1.attribute"])["prototypeToken.bar1.attribute"], "damageBar");
  assert.deepEqual(updates.find((update) => update.items).items, [{
    type: "shipWeapon", name: "Ship Weapon", img: "icons/weapons/artillery/missile.webp",
        flags: { "scifi-urpg": { shipUnitsVersion: 5 } },
    system: {},
  }]);
});
