# Domain docs

Engineering skills consume the repository's domain documentation as follows.

## Before exploring

- Read root `GLOSSARY.md` when it exists.
- Read ADRs in `docs/adr/` that concern the work area when they exist.

If these files do not exist, proceed silently. Create or update them only when a domain-modeling task resolves terminology or an architectural decision.

## Layout

This is a single-context repository. Root `GLOSSARY.md` is the vocabulary source for the repository and `docs/adr/` holds repository ADRs.

Use glossary terms in issue titles, specifications, code proposals, and tests. Surface any conflict with an existing ADR rather than silently overriding it.
