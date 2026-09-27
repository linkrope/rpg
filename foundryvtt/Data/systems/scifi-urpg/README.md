# SciFi@URPG Foundry System

This is the first Foundry VTT system scaffold for SciFi@URPG.

Rules reference: https://irisiflimsi.github.io/rpg-rules/scifi.xml

## Current Scope

- Defines a `character` Actor type.
- Registers a character Actor sheet.
- Supports every skill from `sci-fi/rptoken-viewer.html`.
- Preserves the original skill columns and skill groups.
- Stores damage, skill point pools, notes, token type, property type, and the selected weapon.
- Supports level-up spending from the `Allgemein` and `Speziell` point pools. Skill increases use the original cost rule from the RPToken viewer: each target level costs `ceil(level / 10)`.
- Supports free-form `Talente` entries with a heading, optional value, and Markdown description.
- Stores character notes as Markdown.
- Skill Roll, p5, n5, Dimensions, Attack, and Repair buttons can be dragged to the Foundry hotbar to create actor-bound script macros.

Combat rules, initiative handling, `.rptok` import, armor editing, and attack undo are intentionally left for later steps.

## Local Development

For quick Foundry testing, place or symlink this folder as:

```text
{Foundry user data}/Data/systems/scifi-urpg
```

Then start Foundry and create a world using the `SciFi@URPG` system.
