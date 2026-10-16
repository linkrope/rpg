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
    system.health.max = 20;
    system.health.damage = Math.max(0, Math.round(system.health.damage ?? 0));
    // Bar 1 is a fixed 20-point damage scale; damage itself has no ceiling.
    system.health.value = system.health.damage;
  }

  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);

    if (this.type !== "character") return;
    if (!this._hasUnconsciousChange(changed)) return;
    if (!this._canSyncStatus()) return;

    void this.syncUnconsciousStatus(Boolean(this.system.health?.unconscious));
  }

  _canSyncStatus() {
    if (game.user?.isGM) return true;

    if (typeof this.canUserModify === "function") {
      return this.canUserModify(game.user, "update");
    }

    return this.testUserPermission?.(game.user, "OWNER") ?? false;
  }

  async syncUnconsciousStatus(active) {
    const unconsciousStatusId = "unconscious";
    const defeatedStatusId = CONFIG.specialStatusEffects?.DEFEATED ?? "dead";

    try {
      if (typeof this.toggleStatusEffect === "function") {
        await this.toggleStatusEffect(unconsciousStatusId, { active, overlay: active });
        // This system used to own the defeated marker, so remove any legacy one.
        await this.toggleStatusEffect(defeatedStatusId, { active: false, overlay: false });
      }
    } catch (error) {
      console.warn("SciFi@URPG | Could not update actor unconscious status.", error);
    }

    const tokens = this.getActiveTokens?.(false, false) ?? [];

    for (const token of tokens) {
      try {
        if (typeof token.document?.toggleStatusEffect === "function") {
          await token.document.toggleStatusEffect(unconsciousStatusId, { active, overlay: active });
          await token.document.toggleStatusEffect(defeatedStatusId, { active: false, overlay: false });
        } else if (typeof token.toggleStatusEffect === "function") {
          await token.toggleStatusEffect(unconsciousStatusId, { active, overlay: active });
          await token.toggleStatusEffect(defeatedStatusId, { active: false, overlay: false });
        }
      } catch (error) {
        console.warn("SciFi@URPG | Could not update token unconscious status.", error);
      }
    }
  }

  _hasUnconsciousChange(changed) {
    return foundry.utils.hasProperty(changed, "system.health.unconscious");
  }
}
