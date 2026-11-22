# SciFi@URPG Foundry System

This is the first Foundry VTT system scaffold for SciFi@URPG.

Rules reference: https://irisiflimsi.github.io/rpg-rules/scifi.xml

## Current Scope

- Defines `character` and self-contained `ship` Actor types. Ships do not need
  either Causodes Ship Combat module.
- Registers a character Actor sheet.
- Supports every skill from `sci-fi/rptoken-viewer.html`.
- Preserves the original skill columns and skill groups.
- Stores unbounded damage, skill point pools, notes, token type, property type, and the equipped weapon. Token bar 1 is a fixed 20-point red damage scale.
- Provides actor-owned `weapon` Items with editable attack skill, BEP, hands, weight, range modifier, clip, ammunition, muzzle velocity/type, and description.
- Supports level-up spending from the `Allgemein` and `Speziell` point pools. Skill increases use the original cost rule from the RPToken viewer: each target level costs `ceil(level / 10)`.
- Supports free-form `Talente` entries with a heading, optional value, and Markdown description.
- Stores character notes as Markdown.
- Character Skill Roll, p5, n5, Shock, Dimensions, Attack, and Repair buttons, plus ship Attack and Crew Roll buttons, can be dragged to the Foundry hotbar to create actor-bound script macros.
- Shock uses `20 - total damage + n5`; a result of 0 or less applies Foundry's native `unconscious` status effect. Attacks that inflict damage automatically request the Shock roll from the GM while that status is absent.
- With one character token controlled, targeted characters show their 3D distance and the equipped weapon's calculated range penalty, or melee reach. Distance is measured center to center using token elevations. Scene grid distances and elevations must be in meters.
- Weapons without a clip use melee attacks when the displayed distance is up to 1.0 m, with no distance penalty. Beyond that, range penalty is `-6 × log₂(distance / 5) + range modifier`, capped at zero. Unarmed attacks use the same displayed melee boundary.
- Ships begin as a standard Type I–V design. Length, tonnage, hull,
  battery/reactor, shields, guns, crew, and free tonnage are calculated from
  the design table. A standard design can be customised; selecting a different
  Mk in Edit starts that Mk's standard design. Older ships without a design are given the standard
  design for their saved Mk; existing design data is never rewritten. There is
  no Legacy mode. Ships have all-direction energy shields, fixed hull armour,
  accumulated structural damage in tonnes, shown as the primary token bar in
  shades of red from zero to the design's full tonnage, named ship-weapon entries,
  and selected gunners.
  Weapon damage and energy are derived from the ship's gun-mass allocation;
  entries share that output equally and only carry identity and range data.
  Each weapon fires separately. Gunnery uses `Eingebettete` and
  combines multiple gunners with the normal five-step addition rule. Ship
  range has no modifier at 1 km, then receives −6 per doubling. A hit drains
  the unified shield charge before fixed hull armour, then adds structural
  damage at one tonne per kBEP; it never applies normal equipment Loss. Tokens may be moved freely; only the sheet's acceleration
  and braking control spends battery energy.

`.rptok` import and attack undo are intentionally left for later steps.

## Local Development

For quick Foundry testing, place or symlink this folder as:

```text
{Foundry user data}/Data/systems/scifi-urpg
```

Then start Foundry and create a world using the `SciFi@URPG` system.

## Tests

Run the system's regression tests from the repository root:

```sh
node --test foundryvtt/Data/systems/scifi-urpg/test/*.test.mjs
```

GitHub Actions runs this command for every pushed commit and pull request.

## Pre-commit hook

Enable the repository's pre-commit hook once after cloning
to run the same regression tests before every commit:

```sh
git config core.hooksPath .githooks
```

Use `git commit --no-verify` only when the test suite cannot be run locally.
