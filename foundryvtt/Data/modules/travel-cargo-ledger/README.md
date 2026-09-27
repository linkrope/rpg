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
   members need **Owner** permission to add jumps or later events.
4. Open the `Travel & Cargo Ledger` page. **Add jump** uses one form and
   derives the origin from the previous destination; its stay is the time at
   that origin before departure. **Change jump** uses one
   form for any later correction, reroute, changed travel/stay duration,
   refund, shared cost, or other adjustment.

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

## Event sourcing

The original jump data is never edited through the ledger. A later event can
apply a signed balance change and optionally update a selected jump's actual
destination or actual travel duration. The generated view retains the planned
destination while showing the current, corrected itinerary.

Foundry owners and GMs are trusted users: as with all world data, a GM can
disable a module or alter document flags. The module enforces append-only use
in its own UI and prevents direct edits to generated pages.
