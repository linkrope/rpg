import { isMeleeAttack, isUnarmedWeapon, rangePenalty, weaponForActor } from "../rules/combat.mjs";
import { tokenDistance } from "../rules/distance.mjs";

let badges = null;
let frame = null;

function schedule() {
  if (frame !== null) return;
  frame = requestAnimationFrame(() => {
    frame = null;
    draw();
  });
}

function clear() {
  if (!badges) return;
  for (const child of badges.removeChildren()) child.destroy({ children: true });
}

function draw() {
  clear();
  if (!canvas?.ready || !badges) return;

  // An unambiguous controlled attacker keeps the badge consistent with attacks.
  const controlled = canvas.tokens?.controlled ?? [];
  if (controlled.length !== 1 || controlled[0].actor?.type !== "character") return;
  const source = controlled[0];
  const weapon = weaponForActor(source.actor);
  const reach = Math.max(1, Number(canvas.scene?.grid?.distance ?? 1) || 1);

  for (const target of game.user?.targets ?? []) {
    if (target === source || !target.visible || target.actor?.type !== "character") continue;
    const distance = tokenDistance(source, target);
    if (distance === null) continue;
    const unarmed = isUnarmedWeapon(weapon);
    const modifier = unarmed ? isMeleeAttack(weapon, distance) ? "Melee" : "−∞"
      : isMeleeAttack(weapon, distance) ? "Melee" : weapon.range
      ? rangePenalty(weapon, distance).toFixed(1)
      : distance > reach ? "Out of reach" : "In reach";
    const text = `${distance.toFixed(1)} m · ${modifier}`;
    const Text = foundry.canvas.containers.PreciseText;
    const label = new Text(text, Text.getTextStyle({ fontFamily: "Signika", fontSize: 14, fill: 0xffffff, strokeThickness: 3 }));
    const box = new PIXI.Graphics();
    const pad = 5;
    box.beginFill(0x202020, 0.9);
    box.lineStyle(1, 0xffffff, 0.8);
    box.drawRoundedRect(0, 0, label.width + pad * 2, label.height + pad, 5);
    box.endFill();
    label.position.set(pad, pad / 2);
    const plate = new PIXI.Container();
    plate.addChild(box, label);
    const zoom = canvas.stage?.scale?.x || 1;
    const scale = Math.max(0.5, Math.min(2, 1 / zoom));
    plate.scale.set(scale);
    plate.position.set(target.center.x - (label.width + pad * 2) * scale / 2,
      target.center.y - target.h / 2 - (label.height + pad + 4) * scale);
    badges.addChild(plate);
  }
}

Hooks.on("canvasReady", () => {
  badges?.destroy({ children: true });
  badges = new PIXI.Container();
  badges.eventMode = "none";
  badges.zIndex = 1000;
  canvas.interface.addChild(badges);
  schedule();
});

Hooks.on("canvasTearDown", () => {
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null;
  badges?.destroy({ children: true });
  badges = null;
});

// refreshToken also covers rendered movement animation; updateToken covers elevation.
for (const hook of ["targetToken", "controlToken", "refreshToken", "updateToken", "deleteToken", "updateActor", "updateItem", "createItem", "deleteItem", "canvasPan"]) {
  Hooks.on(hook, schedule);
}
