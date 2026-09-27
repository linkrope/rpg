/**
 * Travel & Cargo Ledger
 *
 * The journal is the presentation layer. The source of truth is the append-only
 * event list in flags.travel-cargo-ledger.ledger. Do not edit that flag by hand.
 */
const MODULE_ID = "travel-cargo-ledger";
const FLAG = "ledger";
const LEGACY_COST_PER_DAY = 32;

const number = (value, fallback = 0) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const id = () => foundry.utils.randomID();
const esc = foundry.utils.escapeHTML;
const money = value => `${number(value).toLocaleString(undefined, {maximumFractionDigits: 2})} t Dili`;
const roundedMoney = value => `${Math.round(number(value)).toLocaleString()} t Dili`;
const hasOwner = journal => journal?.testUserPermission(game.user, "OWNER");

function ledgerFor(journal) {
  const ledger = foundry.utils.deepClone(journal.getFlag(MODULE_ID, FLAG) ?? {
    version: 2, openingBalance: 0, startingDestination: "", dailyTravelCost: LEGACY_COST_PER_DAY, events: [], summaryPageId: null
  });
  // v1 stored a stay on the destination that had just been reached. v2 stores
  // it on the next departure, where it is actually known and recorded.
  if ((ledger.version ?? 1) < 2) {
    let previousStay = 0;
    for (const event of ledger.events.filter(event => event.type === "jump")) {
      const oldStay = number(event.data.stayDays);
      event.data.stayDays = previousStay;
      previousStay = oldStay;
    }
    ledger.pendingStayDays = previousStay;
    ledger.version = 2;
  }
  const pageRecords = [...journal.pages]
    .map(page => page.getFlag(MODULE_ID, "record"))
    .filter(Boolean)
    .sort((a, b) => number(a.sequence) - number(b.sequence));
  if (pageRecords.length) ledger.events = pageRecords;
  return ledger;
}

function currentJumps(ledger) {
  const jumps = ledger.events.filter(event => event.type === "jump")
    .map(event => ({...foundry.utils.deepClone(event), data: {...event.data}}));
  // Corrections never rewrite their original event. They produce the current view.
  for (const event of ledger.events.filter(event => event.type === "event" && event.changes?.targetId)) {
    const jump = jumps.find(candidate => candidate.id === event.changes.targetId);
    if (!jump) continue;
    for (const [key, value] of Object.entries(event.changes)) {
      if (key !== "targetId" && value !== "" && value !== null && value !== undefined) jump.data[key] = value;
    }
  }
  return jumps;
}

function calculate(ledger) {
  const jumps = currentJumps(ledger);
  let day = 0;
  // Keep the first origin when upgrading a ledger created before the setting existed.
  let origin = ledger.startingDestination || jumps[0]?.data.origin || "—";
  for (const jump of jumps) {
    const data = jump.data;
    data.origin = origin;
    const travelDays = number(data.travelDays);
    const stayDays = number(data.stayDays);
    const blinkdrive = data.blinkdrive === true || data.blinkdrive === "true";
    const dailyTravelCost = number(data.dailyTravelCost, LEGACY_COST_PER_DAY);
    data.dailyTravelCost = dailyTravelCost;
    data.travelCost = travelDays * dailyTravelCost;
    const buyFormula = number(data.purchaseCargo) > 0 && number(data.buySpeed) > 0 && number(data.buyBE) > 0;
    if (buyFormula) data.purchaseDili = number(data.buySpeed) / 100 * number(data.purchaseCargo) / number(data.buyBE) * 10;
    const sellFormula = number(data.cargoSold) > 0 && number(data.sellSpeed) > 0 && number(data.sellBE) > 0;
    data.saleRevenue = sellFormula ? number(data.cargoSold) / number(data.sellBE) / (number(data.sellSpeed) / 100) * 10 : (number(data.cargoSold) > 0 && number(data.saleCargoPerUnit) > 0 ? number(data.cargoSold) / number(data.saleCargoPerUnit) * number(data.saleDiliPerUnit) : 0);
    data.originArrivalDay = day;
    day += stayDays;
    data.originDepartureDay = day;
    day += blinkdrive ? 0 : travelDays;
    data.destinationDay = day;
    origin = data.actualDestination || data.destination || origin;
  }
  const corrections = new Map();
  for (const event of ledger.events.filter(event => event.type === "event" && event.changes?.targetId)) {
    corrections.set(event.changes.targetId, number(corrections.get(event.changes.targetId)) + number(event.balanceChange));
  }
  let balance = number(ledger.openingBalance);
  for (const jump of jumps) {
    balance -= number(jump.data.purchaseDili) + number(jump.data.travelCost);
    balance += number(jump.data.saleRevenue) + number(corrections.get(jump.id));
    jump.balanceAfter = balance;
  }
  // Standalone adjustments have no jump to attribute them to.
  for (const event of ledger.events.filter(event => event.type === "event" && !event.changes?.targetId)) balance += number(event.balanceChange);
  const timeline = [];
  for (const event of ledger.events) {
    timeline.push({...event, balanceAfter: event.changes?.targetId ? jumps.find(jump => jump.id === event.changes.targetId)?.balanceAfter : balance});
  }
  return {jumps, timeline, balance};
}

const originDate = data => `day ${data.originDepartureDay}`;

function summaryHTML(journal, ledger) {
  const {jumps, timeline, balance} = calculate(ledger);
  const rows = jumps.map((jump, index) => {
    const data = jump.data;
    return `<tr><td>${index + 1}</td><td>${esc(data.origin || "—")}</td><td>${originDate(data)}</td><td>${esc(data.actualDestination || data.destination || "—")}</td><td>day ${data.destinationDay}</td><td>${roundedMoney(jump.balanceAfter)}</td></tr>`;
  }).join("");
  return `<section class="travel-cargo-ledger" data-ledger-id="${journal.id}">
    <div class="travel-cargo-ledger-controls"><button type="button" data-tcl="jump"><i class="fa-solid fa-plus"></i> Add jump</button><button type="button" data-tcl="change"><i class="fa-solid fa-pen"></i> Change jump</button><button type="button" data-tcl="delete"><i class="fa-solid fa-trash"></i> Delete jump</button><button type="button" data-tcl="settings"><i class="fa-solid fa-gear"></i> Settings</button><button type="button" data-tcl="rebuild"><i class="fa-solid fa-rotate"></i> Rebuild view</button></div>
    <p class="travel-cargo-ledger-note">This is a generated view. Add a correction or adjustment instead of altering historical records.</p>
    <h2>Travel & Cargo</h2>
    <table class="travel-cargo-ledger-table"><thead><tr><th>#</th><th>Origin</th><th>Date</th><th>Destination</th><th>Date</th><th>Balance</th></tr></thead><tbody>${rows || "<tr><td colspan=6>No jumps recorded.</td></tr>"}</tbody></table></section>`;
}

function jumpHTML(jump, index) {
  const data = jump.data;
  const saleRate = number(data.saleCargoPerUnit) > 0 ? `${number(data.saleCargoPerUnit)} t Cargo = ${money(data.saleDiliPerUnit)}` : "—";
  const buyTerms = number(data.buySpeed) > 0 && number(data.buyBE) > 0 ? `${number(data.purchaseCargo)} t Cargo · ${number(data.buySpeed)}% · BE ${number(data.buyBE)}` : `${money(data.purchaseDili)} = ${number(data.purchaseCargo)} t Cargo`;
  const sellTerms = number(data.sellSpeed) > 0 && number(data.sellBE) > 0 ? `${number(data.cargoSold)} t Cargo · ${number(data.sellSpeed)}% · BE ${number(data.sellBE)}` : saleRate;
  return `<section class="travel-cargo-ledger">
    <p class="travel-cargo-ledger-note">Generated from the immutable jump record. Add a later event to correct it.</p>
    <h1>Jump ${index + 1}: ${esc(data.origin || "?")} → ${esc(data.actualDestination || data.destination || "?")}</h1>
    <h2>Itinerary</h2><table><tbody>
      <tr><th>Destination</th><td>${esc(data.destination || "—")}</td></tr>
      ${data.actualDestination ? `<tr><th>Changed destination</th><td>${esc(data.actualDestination)}</td></tr>` : ""}
      <tr><th>Origin date</th><td>${originDate(data)}</td></tr>
      <tr><th>Destination date</th><td>day ${data.destinationDay}</td></tr>
      <tr><th>Travel days</th><td>${number(data.travelDays)}${data.blinkdrive ? " (Blinkdrive)" : ""}</td></tr>
      <tr><th>Balance</th><td>${money(jump.balanceAfter)}</td></tr>
    </tbody></table>
    <h2>Cargo & cash</h2><table><tbody>
      <tr><th>Buying</th><td>${buyTerms} / ${money(data.purchaseDili)}</td></tr>
      <tr><th>Selling</th><td>${sellTerms} / ${money(data.saleRevenue)}</td></tr>
      <tr><th>Travel cost</th><td>${number(data.travelDays)} × ${money(data.dailyTravelCost)}/day = ${money(data.travelCost)}</td></tr>
    </tbody></table>
  </section>`;
}

function changeHTML(event, ledger) {
  const target = calculate(ledger).jumps.find(jump => jump.id === event.changes?.targetId);
  return `<section class="travel-cargo-ledger"><p class="travel-cargo-ledger-note">Immutable change record.</p><h1>Change</h1><table><tbody><tr><th>Description</th><td>${esc(event.description || "Adjustment")}</td></tr><tr><th>Balance change</th><td>${money(event.balanceChange)}</td></tr>${target ? `<tr><th>Affected jump</th><td>${esc(target.data.origin)} → ${esc(target.data.actualDestination || target.data.destination)}</td></tr>` : ""}</tbody></table></section>`;
}

async function writeLedger(journal, ledger) {
  const settings = foundry.utils.deepClone(ledger);
  settings.events = [];
  await journal.setFlag(MODULE_ID, FLAG, settings);
  await rebuild(journal, ledger);
}

async function rebuild(journal, providedLedger) {
  const ledger = providedLedger ?? ledgerFor(journal);
  const {jumps} = calculate(ledger);
  let page = ledger.summaryPageId ? journal.pages.get(ledger.summaryPageId) : null;
  const content = summaryHTML(journal, ledger);
  if (!page) {
    [page] = await journal.createEmbeddedDocuments("JournalEntryPage", [{name: "Travel & Cargo Ledger", type: "text", text: {format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML, content}, flags: {[MODULE_ID]: {summary: true}}}], {travelCargoLedger: true});
    ledger.summaryPageId = page.id;
    await journal.setFlag(MODULE_ID, FLAG, ledger);
  } else await page.update({"text.content": content}, {travelCargoLedger: true});
  for (const [index, jump] of jumps.entries()) {
    const jumpPage = journal.pages.find(page => page.getFlag(MODULE_ID, "record")?.id === jump.id) ?? (jump.pageId ? journal.pages.get(jump.pageId) : null);
    const pageData = {name: `Jump ${index + 1}: ${jump.data.origin || "?"} → ${jump.data.actualDestination || jump.data.destination || "?"}`, type: "text", text: {format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML, content: jumpHTML(jump, index)}, flags: {[MODULE_ID]: {jump: true, eventId: jump.id, record: {...jump, sequence: index}}}};
    if (jumpPage) await jumpPage.update(pageData, {travelCargoLedger: true});
    else {
      const [created] = await journal.createEmbeddedDocuments("JournalEntryPage", [pageData], {travelCargoLedger: true});
      const source = ledger.events.find(event => event.id === jump.id);
      source.pageId = created.id;
    }
  }
  for (const [index, event] of ledger.events.filter(event => event.type === "event").entries()) {
    const changePage = journal.pages.find(page => page.getFlag(MODULE_ID, "record")?.id === event.id);
    const pageData = {name: `Change: ${event.description || "Adjustment"}`, type: "text", text: {format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML, content: changeHTML(event, ledger)}, flags: {[MODULE_ID]: {change: true, record: {...event, sequence: jumps.length + index}}}};
    if (changePage) await changePage.update(pageData, {travelCargoLedger: true});
    else await journal.createEmbeddedDocuments("JournalEntryPage", [pageData], {travelCargoLedger: true});
  }
  // Persist newly assigned page ids without modifying the historical jump facts.
  if (jumps.some(jump => !jump.pageId)) {
    const settings = foundry.utils.deepClone(ledger);
    settings.events = [];
    await journal.setFlag(MODULE_ID, FLAG, settings);
  }
}

async function formDialog(title, content, submitLabel) {
  return foundry.applications.api.DialogV2.wait({
    window: {title}, content, modal: true, rejectClose: false,
    buttons: [{action: "submit", label: submitLabel, default: true, callback: (event, button) => Object.fromEntries(new FormData(button.form))}]
  });
}

async function addJump(journal) {
  if (!hasOwner(journal)) return ui.notifications.warn("You need Owner permission on this journal.");
  const ledger = ledgerFor(journal);
  const fields = await formDialog("Add jump", `<p class="hint">The origin is the previous destination. Leave Buying and Selling at 0 when no cargo changes hands.</p><fieldset><legend>Travel</legend><div class="form-group"><label>Stay days at origin</label><input name="stayDays" type="number" min="0" step="0.1" value="${number(ledger.pendingStayDays)}" autofocus></div><div class="form-group"><label>Destination</label><input name="destination" required></div><div class="form-group"><label>Travel days</label><input name="travelDays" type="number" min="0" step="0.1" value="0"></div><div class="form-group"><label>Blinkdrive</label><input name="blinkdrive" type="checkbox" value="true"><p class="hint">Travel costs are charged, but no time passes.</p></div></fieldset><fieldset><legend>Buying</legend><div class="form-group"><label>t Cargo</label><input name="purchaseCargo" type="number" step="0.01" value="0"></div><div class="form-group"><label>Speed (%)</label><input name="buySpeed" type="number" min="0" step="1" value="0"></div><div class="form-group"><label>BE</label><input name="buyBE" type="number" min="0" step="0.01" value="0"></div></fieldset><fieldset><legend>Selling</legend><div class="form-group"><label>t Cargo</label><input name="cargoSold" type="number" step="0.01" value="0"></div><div class="form-group"><label>Speed (%)</label><input name="sellSpeed" type="number" min="0" step="1" value="0"></div><div class="form-group"><label>BE</label><input name="sellBE" type="number" min="0" step="0.01" value="0"></div></fieldset>`, "Add jump");
  if (!fields) return;
  ledger.events.push({id: id(), type: "jump", createdAt: Date.now(), createdBy: game.user.id, data: {destination: fields.destination, actualDestination: "", travelDays: number(fields.travelDays), stayDays: number(fields.stayDays), blinkdrive: fields.blinkdrive === "true", dailyTravelCost: number(ledger.dailyTravelCost, LEGACY_COST_PER_DAY), purchaseCargo: number(fields.purchaseCargo), buySpeed: number(fields.buySpeed), buyBE: number(fields.buyBE), cargoSold: number(fields.cargoSold), sellSpeed: number(fields.sellSpeed), sellBE: number(fields.sellBE)}});
  ledger.pendingStayDays = 0;
  await writeLedger(journal, ledger);
}

async function changeJump(journal) {
  if (!hasOwner(journal)) return ui.notifications.warn("You need Owner permission on this journal.");
  const ledger = ledgerFor(journal);
  const jumps = calculate(ledger).jumps;
  const options = jumps.map((jump, index) => `<option value="${jump.id}">${index + 1}: ${esc(jump.data.origin)} → ${esc(jump.data.actualDestination || jump.data.destination)}</option>`).join("");
  const fields = await formDialog("Change jump", `<p class="hint">Use this for a later correction, reroute, refund, or other adjustment. Leave a data field empty if it did not change.</p><div class="form-group"><label>Jump</label><select name="targetId"><option value="">No jump data change</option>${options}</select></div><div class="form-group"><label>Description</label><input name="description" required autofocus></div><div class="form-group"><label>Balance change</label><input name="balanceChange" type="number" step="0.01" value="0"><p class="hint">Positive = income; negative = expense.</p></div><fieldset><legend>Changed data</legend><div class="form-group"><label>Changed destination</label><input name="actualDestination"></div><div class="form-group"><label>Travel days</label><input name="travelDays" type="number" min="0" step="0.1"></div><div class="form-group"><label>Stay days at origin</label><input name="stayDays" type="number" min="0" step="0.1"></div></fieldset>`, "Record change");
  if (!fields) return;
  const changes = {};
  if (fields.targetId) for (const key of ["actualDestination", "travelDays", "stayDays"]) if (fields[key] !== "") changes[key] = key.endsWith("Days") ? number(fields[key]) : fields[key];
  if (fields.targetId) changes.targetId = fields.targetId;
  ledger.events.push({id: id(), type: "event", createdAt: Date.now(), createdBy: game.user.id, description: fields.description, balanceChange: number(fields.balanceChange), changes});
  await writeLedger(journal, ledger);
}

async function deleteJump(journal) {
  if (!hasOwner(journal)) return ui.notifications.warn("You need Owner permission on this journal.");
  const ledger = ledgerFor(journal);
  const jumps = calculate(ledger).jumps;
  if (!jumps.length) return ui.notifications.warn("There are no jumps to delete.");
  const options = jumps.map((jump, index) => `<option value="${jump.id}">${index + 1}: ${esc(jump.data.origin)} → ${esc(jump.data.actualDestination || jump.data.destination)}</option>`).join("");
  const fields = await formDialog("Delete jump", `<p class="hint">This permanently removes the jump page and all Change pages attached to it.</p><div class="form-group"><label>Jump</label><select name="targetId">${options}</select></div>`, "Continue");
  if (!fields) return;
  const jump = jumps.find(candidate => candidate.id === fields.targetId);
  if (!jump) return;
  const confirmed = await foundry.applications.api.DialogV2.confirm({window: {title: "Delete jump"}, content: `<p>Delete <strong>${esc(jump.data.origin)} → ${esc(jump.data.actualDestination || jump.data.destination)}</strong> and its attached changes? This cannot be undone.</p>`, modal: true, rejectClose: false, yes: {label: "Delete"}, no: {label: "Cancel"}});
  if (!confirmed) return;
  const pageIds = [...journal.pages]
    .filter(page => {
      const record = page.getFlag(MODULE_ID, "record");
      return record?.id === jump.id || (record?.type === "event" && record.changes?.targetId === jump.id);
    })
    .map(page => page.id);
  await journal.deleteEmbeddedDocuments("JournalEntryPage", pageIds, {travelCargoLedger: true});
  await rebuild(journal);
}

async function ledgerSettings(journal) {
  if (!hasOwner(journal)) return ui.notifications.warn("You need Owner permission on this journal.");
  const ledger = ledgerFor(journal);
  const fields = await formDialog("Settings", `<p class="hint">The daily rate is copied into future jumps. Changing it does not alter recorded jumps.</p><div class="form-group"><label>Starting destination</label><input name="startingDestination" value="${esc(ledger.startingDestination || "")}"></div><div class="form-group"><label>Opening balance</label><input name="openingBalance" type="number" step="0.01" value="${number(ledger.openingBalance)}"></div><div class="form-group"><label>Travel cost / day for new jumps</label><input name="dailyTravelCost" type="number" min="0" step="0.01" value="${number(ledger.dailyTravelCost, LEGACY_COST_PER_DAY)}"></div>`, "Save settings");
  if (!fields) return;
  ledger.startingDestination = fields.startingDestination;
  ledger.openingBalance = number(fields.openingBalance);
  ledger.dailyTravelCost = number(fields.dailyTravelCost, LEGACY_COST_PER_DAY);
  await writeLedger(journal, ledger);
}

async function createLedger({name = "Travel & Cargo", openingBalance = 0, startingDestination = "", dailyTravelCost = LEGACY_COST_PER_DAY} = {}) {
  const journal = await JournalEntry.create({name, ownership: {[game.user.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER}});
  const ledger = {version: 1, openingBalance: number(openingBalance), startingDestination, dailyTravelCost: number(dailyTravelCost, LEGACY_COST_PER_DAY), events: [], summaryPageId: null};
  await writeLedger(journal, ledger);
  journal.sheet.render(true);
  return journal;
}

Hooks.once("ready", async () => {
  game.modules.get(MODULE_ID).api = {createLedger, addJump, changeJump, deleteJump, ledgerSettings, rebuild: journal => rebuild(journal)};
  // Refresh generated views when a new module version changes their layout.
  for (const journal of game.journal.filter(entry => entry.getFlag(MODULE_ID, FLAG) && hasOwner(entry))) {
    await rebuild(journal);
  }
  console.info(`${MODULE_ID} | Ready. Create a ledger with game.modules.get('${MODULE_ID}').api.createLedger({openingBalance: 160})`);
});

Hooks.on("renderJournalDirectory", (app, html) => {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root || root.querySelector("[data-tcl-create]")) return;
  const header = root.querySelector(".directory-header, header");
  if (!header || !game.user.isGM) return;
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.tclCreate = "true";
  button.title = "Create Travel & Cargo Ledger";
  button.innerHTML = '<i class="fa-solid fa-route"></i> Travel & Cargo';
  button.addEventListener("click", async () => {
    const fields = await formDialog("Create Travel & Cargo Ledger", `<div class="form-group"><label>Ledger name</label><input name="name" value="Travel & Cargo" required autofocus></div><div class="form-group"><label>Starting destination</label><input name="startingDestination"></div><div class="form-group"><label>Opening balance</label><input name="openingBalance" type="number" step="0.01" value="0"></div><div class="form-group"><label>Travel cost / day</label><input name="dailyTravelCost" type="number" min="0" step="0.01" value="${LEGACY_COST_PER_DAY}"></div>`, "Create ledger");
    if (fields) await createLedger({name: fields.name, startingDestination: fields.startingDestination, openingBalance: number(fields.openingBalance), dailyTravelCost: number(fields.dailyTravelCost, LEGACY_COST_PER_DAY)});
  });
  header.append(button);
});

Hooks.on("renderJournalEntryPageTextSheet", (app, html) => {
  const page = app.document;
  if (!page.getFlag(MODULE_ID, "summary")) return;
  html.querySelectorAll?.("[data-tcl]").forEach(button => button.addEventListener("click", async event => {
    const journal = page.parent;
    const action = event.currentTarget.dataset.tcl;
    if (action === "jump") await addJump(journal);
    if (action === "change") await changeJump(journal);
    if (action === "delete") await deleteJump(journal);
    if (action === "settings") await ledgerSettings(journal);
    if (action === "rebuild") await rebuild(journal);
  }));
});

// Generated pages and the canonical event list can only be changed through this module.
Hooks.on("preUpdateJournalEntryPage", (page, change, options) => {
  if ((page.getFlag(MODULE_ID, "summary") || page.getFlag(MODULE_ID, "jump") || page.getFlag(MODULE_ID, "change")) && !options.travelCargoLedger) {
    ui.notifications.warn("Travel & Cargo Ledger pages are generated. Add an event instead.");
    return false;
  }
});

Hooks.on("preCreateJournalEntryPage", (page, data, options) => {
  if (page.parent?.getFlag(MODULE_ID, FLAG) && !options.travelCargoLedger) {
    ui.notifications.warn("Use Add jump or Change jump in the Travel & Cargo Ledger.");
    return false;
  }
});

Hooks.on("preDeleteJournalEntryPage", (page, options) => {
  if ((page.getFlag(MODULE_ID, "summary") || page.getFlag(MODULE_ID, "jump") || page.getFlag(MODULE_ID, "change")) && !options.travelCargoLedger) {
    ui.notifications.warn("Ledger pages are generated and cannot be deleted individually.");
    return false;
  }
});
