import { DIMENSION_MAX, DIMENSION_MIN, buildDimensionRows, clampDimension } from "../rules/dimensions.mjs";

export class SciFiDimensionsApp extends Application {
  static _instances = new Map();
  static _latestValues = new Map();

  static forActor(actor) {
    const actorId = actor?.id ?? "global";
    if (!this._instances.has(actorId)) this._instances.set(actorId, new this({ actor }));
    return this._instances.get(actorId);
  }

  static openForActor(actor, value = null) {
    if (value !== null && value !== undefined) this.setLatestForActor(actor, value, { render: false });
    this.forActor(actor).render(true);
  }

  static setLatestForActor(actor, value, { render = true } = {}) {
    const actorId = actor?.id ?? "global";
    const latestValue = clampDimension(value);
    this._latestValues.set(actorId, latestValue);

    const instance = this._instances.get(actorId);
    if (!instance) return;

    instance.value = latestValue;
    if (render && instance.rendered) instance.render(false);
  }

  constructor({ actor = null, ...options } = {}) {
    super({
      ...options,
      id: `scifi-urpg-dimensions-${actor?.id ?? "global"}`,
      title: actor?.name ? `Dimensions - ${actor.name}` : "Dimensions"
    });
    this.actor = actor;
    this.actorId = actor?.id ?? "global";
    this.value = SciFiDimensionsApp._latestValues.get(this.actorId) ?? 0;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "scifi-urpg-dimensions",
      classes: ["scifi-urpg", "scifi-urpg-dimensions-app"],
      template: "systems/scifi-urpg/templates/apps/dimensions-app.hbs",
      title: "Dimensions",
      width: 430,
      height: 390,
      resizable: false
    });
  }

  getData(options = {}) {
    const context = super.getData(options);
    context.min = DIMENSION_MIN;
    context.max = DIMENSION_MAX;
    context.value = clampDimension(this.value);
    context.rows = buildDimensionRows(context.value);
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("[data-action='dimension-slider']").on("input", this._onSlider.bind(this));
    html.find("[data-action='dimension-nudge']").on("click", this._onNudge.bind(this));
    html.find("[data-action='dimension-reset-latest']").on("click", this._onResetLatest.bind(this));
  }

  _setValue(value, { remember = false } = {}) {
    this.value = clampDimension(value);
    if (remember) SciFiDimensionsApp._latestValues.set(this.actorId, this.value);
    this._refreshValues();
  }

  _onSlider(event) {
    this._setValue(event.currentTarget.value);
  }

  _onNudge(event) {
    event.preventDefault();
    this._setValue(this.value + Number(event.currentTarget.dataset.delta ?? 0));
  }

  _onResetLatest(event) {
    event.preventDefault();
    this._setValue(SciFiDimensionsApp._latestValues.get(this.actorId) ?? 0);
  }

  _refreshValues() {
    if (!this.element?.length) return;

    this.element.find("[data-dimension-value]").text(this.value);
    this.element.find("[data-action='dimension-slider']").val(this.value);

    const rows = buildDimensionRows(this.value);
    for (const row of rows) {
      this.element.find(`[data-dimension-row='${row.label}']`).text(row.value);
    }
  }
}
