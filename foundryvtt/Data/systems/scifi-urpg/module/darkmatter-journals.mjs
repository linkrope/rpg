/**
 * A selectable Journal Entry sheet for SciFi@URPG content.
 * Choose "SciFi" from Configure Sheet > This Sheet on a journal entry.
 */
export class DarkMatterJournalSheet extends foundry.applications.sheets.journal.JournalEntrySheet {
  static DEFAULT_OPTIONS = {
    classes: ["scifi-urpg-scifi-journal"],
    viewClasses: ["scifi-urpg-scifi-journal"]
  };
}

Hooks.once("init", () => {
  foundry.applications.apps.DocumentSheetConfig.registerSheet(
    JournalEntry,
    "scifi-urpg",
    DarkMatterJournalSheet,
    {
      label: "SciFi"
    }
  );
});
