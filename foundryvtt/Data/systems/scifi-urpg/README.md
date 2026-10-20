# SciFi@URPG Foundry System

This is the first Foundry VTT system scaffold for SciFi@URPG.

Rules reference: https://irisiflimsi.github.io/rpg-rules/scifi.xml

## Current Scope

- Defines a `character` Actor type.
- Registers a character Actor sheet.
- Supports every skill from `sci-fi/rptoken-viewer.html`.
- Preserves the original skill columns and skill groups.
- Stores unbounded damage, skill point pools, notes, token type, property type, and the equipped weapon. Token bar 1 is a fixed 20-point red damage scale.
- Provides actor-owned `weapon` Items with editable attack skill, BEP, hands, weight, range, rate, clip, ammunition, muzzle velocity/type, and description.
- Supports level-up spending from the `Allgemein` and `Speziell` point pools. Skill increases use the original cost rule from the RPToken viewer: each target level costs `ceil(level / 10)`.
- Supports free-form `Talente` entries with a heading, optional value, and Markdown description.
- Stores character notes as Markdown.
- Skill Roll, p5, n5, Shock, Dimensions, Attack, and Repair buttons can be dragged to the Foundry hotbar to create actor-bound script macros.
- Shock uses `20 - total damage + n5`; a result of 0 or less marks the character unconscious. Attacks that inflict damage automatically request the Shock roll from the GM.
- With one character token controlled, targeted characters show their 3D distance and equipped weapon's range modifier, or melee reach. Distance is measured center to center using token elevations. Scene grid distances and elevations must be in meters.
- Short and long weapons use melee attacks when the displayed distance is up to 1.0 m, with no distance penalty; beyond that they use their listed throwing range and its distance penalty. Unarmed attacks use the same displayed melee boundary.

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
