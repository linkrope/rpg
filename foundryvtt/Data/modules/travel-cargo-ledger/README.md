# Travel & Cargo Ledger

An independent Foundry VTT v14 module for a crew-maintained travel and cargo
ledger. It is not dependent on another journal module.

## Use

1. Enable **Travel & Cargo Ledger** in the world’s Manage Modules screen and
   reload the world.
2. In the Journal sidebar, use the **Travel & Cargo** button. Its single setup
   form records the starting destination, opening balance, and daily travel
   rate, then creates a normal Foundry journal with a generated overview page.
3. Set the journal's ownership in the normal Foundry permission dialog. Crew
   members need **Owner** permission to add jumps or edit the newest entry.
4. Open the `Travel & Cargo Ledger` page. **Add jump** uses one form and
   derives the origin from the previous destination; its stay is the time at
   that origin before departure. **Change jump** records a later correction,
   reroute, income, expense, or other adjustment. **Edit** revises only the
   newest jump or change page. Once another entry is added, the earlier page is
   locked.

The journal contains a page per jump as requested. Both the jump pages and the
overview are generated and read-only; they are a view of the source events.

## Accounting conventions

* Each jump stores its own travel rate. The ledger setting is merely the rate
  prefilled for future jumps, so a later rate change cannot alter history.
* Buying uses cargo, Speed (%), and BE. Cost is
  `Speed / 100 × Cargo / BE × 10` t Dili.
* Selling uses cargo, Speed (%), and BE. Revenue is
  `Cargo / BE / (Speed / 100) × 10` t Dili.
* A shared travel cost is an event, such as `Cost sharing received`, with a
  positive balance change of `48`; it does not change the original full travel
  cost.

## Locked history

The newest entry is editable so a just-recorded jump or change can be fixed
without deleting it. Adding another entry locks it, preserving the history of
the journey. Existing change pages can still be edited when they are the
newest entry.

Foundry owners and GMs are trusted users: as with all world data, a GM can
disable a module or alter document flags. The module limits edits to the newest
entry in its own UI and prevents direct edits to generated pages.
