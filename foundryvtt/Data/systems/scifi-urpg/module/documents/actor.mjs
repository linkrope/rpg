export class SciFiActor extends Actor {
  _preCreate(data, options, user) {
    super._preCreate(data, options, user);

    if (this.type !== "character") return;

    this.updateSource({
      "prototypeToken.actorLink": true,
      "prototypeToken.bar1.attribute": "health",
      "prototypeToken.bar2.attribute": null,
      "prototypeToken.displayName": CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
      "prototypeToken.displayBars": CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER
    });
  }

  prepareBaseData() {
    super.prepareBaseData();

    if (this.type !== "character") return;

    const system = this.system;
    system.health.max = Math.max(1, Math.round(system.health.max ?? 20));
    system.health.damage = Math.max(0, Math.min(system.health.max, Math.round(system.health.damage ?? 0)));
    system.health.value = Math.max(0, system.health.max - system.health.damage);
  }

  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);

    if (this.type !== "character") return;
    if (!this._hasHealthDamageChange(changed)) return;
    if (!this._canSyncDefeatedStatus()) return;

    const damage = Number(this.system.health?.damage ?? 0);
    const max = Math.max(1, Number(this.system.health?.max ?? 20));

    void this.syncDefeatedStatus(damage >= max);
  }

  _canSyncDefeatedStatus() {
    if (game.user?.isGM) return true;

    if (typeof this.canUserModify === "function") {
      return this.canUserModify(game.user, "update");
    }

    return this.testUserPermission?.(game.user, "OWNER") ?? false;
  }

  async syncDefeatedStatus(active) {
    const statusId = CONFIG.specialStatusEffects?.DEFEATED ?? "dead";

    try {
      if (typeof this.toggleStatusEffect === "function") {
        await this.toggleStatusEffect(statusId, { active, overlay: active });
      }
    } catch (error) {
      console.warn("SciFi@URPG | Could not update actor dead status.", error);
    }

    const tokens = this.getActiveTokens?.(false, false) ?? [];

    for (const token of tokens) {
      try {
        if (typeof token.document?.toggleStatusEffect === "function") {
          await token.document.toggleStatusEffect(statusId, { active });
        } else if (typeof token.toggleStatusEffect === "function") {
          await token.toggleStatusEffect(statusId, { active });
        }
      } catch (error) {
        console.warn("SciFi@URPG | Could not update token dead status.", error);
      }
    }
  }

  _hasHealthDamageChange(changed) {
    return foundry.utils.hasProperty(changed, "system.health.damage")
      || foundry.utils.hasProperty(changed, "system.health")
      || foundry.utils.hasProperty(changed, "system");
  }
}
